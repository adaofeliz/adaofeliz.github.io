"""
Local voice-cloned synthesis plus word alignment, one process per post.

Driven by scripts/lib/local-tts.mjs. Loading Fish S2 Pro takes far longer
than generating a single chunk, so every chunk of a post goes through one
process that loads the model once.

Protocol
  stdin   one JSON object:
            { model, referenceAudio, referenceText, seed, maxNewTokens,
              chunks: [{ text, out }] }
  stdout  one JSON line per chunk, in order:
            { index, seconds, words: [{ start, end }] }
          `words` has exactly one entry per whitespace-delimited word of the
          chunk text, which is what the browser highlight indexes against.
  stderr  progress and diagnostics.

Why forced alignment rather than transcription: the text is already known.
A transcriber would hear "2026" as "twenty twenty-six" and return a different
number of words, desynchronising the highlight. Aligning the known words
against the audio keeps the count exact by construction.
"""

import json
import re
import sys

import mlx.core as mx
import numpy as np
import soundfile as sf
import torch
import torchaudio
import torchaudio.functional as F
from mlx_speech import tts
from num2words import num2words

ALIGN_SAMPLE_RATE = 16000


def log(message):
    print(message, file=sys.stderr, flush=True)


class Aligner:
    """CTC forced alignment with torchaudio's MMS_FA model, run on CPU."""

    def __init__(self):
        bundle = torchaudio.pipelines.MMS_FA
        self.model = bundle.get_model(with_star=False)
        self.dictionary = bundle.get_dict(star=None)
        # Index 0 is the CTC blank, which may not appear in alignment targets.
        self.blank = 0

    def normalize(self, word):
        """Reduce a word to characters the aligner knows, spelling out digits."""
        spelled = re.sub(r"\d+", lambda m: f" {num2words(int(m.group()))} ", word)
        return "".join(
            c for c in spelled.lower() if self.dictionary.get(c, self.blank) != self.blank
        )

    def align(self, waveform, sample_rate, text):
        words = text.split()
        normalized = [self.normalize(w) for w in words]
        tokens = [self.dictionary[c] for n in normalized for c in n]

        audio = torch.from_numpy(waveform).unsqueeze(0)
        audio = F.resample(audio, sample_rate, ALIGN_SAMPLE_RATE)

        spans = []
        frame_seconds = 0.0
        if tokens:
            with torch.inference_mode():
                emission, _ = self.model(audio)
            if emission.shape[1] < len(tokens):
                raise RuntimeError(
                    f"Audio too short to align: {emission.shape[1]} frames for {len(tokens)} characters. "
                    "The model probably stopped early on this chunk."
                )
            alignment, scores = F.forced_align(
                emission, torch.tensor([tokens], dtype=torch.int32), blank=self.blank
            )
            spans = F.merge_tokens(alignment[0], scores[0].exp())
            frame_seconds = audio.shape[1] / emission.shape[1] / ALIGN_SAMPLE_RATE

        result = []
        cursor = 0
        previous_end = 0.0
        for n in normalized:
            word_spans = spans[cursor : cursor + len(n)]
            cursor += len(n)
            if word_spans:
                start = round(word_spans[0].start * frame_seconds, 3)
                end = round(word_spans[-1].end * frame_seconds, 3)
            else:
                # Nothing speakable (a bare dash or symbol): keep the word so
                # the count stays exact, but give it zero width.
                start = end = previous_end
            result.append({"start": start, "end": end})
            previous_end = end

        return result


def to_mono_float32(waveform):
    array = np.array(waveform, dtype=np.float32)
    return array.reshape(-1) if array.ndim == 1 or 1 in array.shape else array.mean(axis=0)


def main():
    request = json.load(sys.stdin)
    chunks = request["chunks"]

    log(f"Loading {request['model']}...")
    model = tts.load(request["model"])
    voice = model.prepare_reference(
        request["referenceAudio"], reference_text=request["referenceText"]
    )

    log("Loading aligner...")
    aligner = Aligner()

    for index, chunk in enumerate(chunks):
        # Seeded per chunk so the same text and voice regenerate identically.
        mx.random.seed(request["seed"])
        output = model.generate(
            chunk["text"], reference_audio=voice, max_new_tokens=request["maxNewTokens"]
        )
        waveform = to_mono_float32(output.waveform)
        sf.write(chunk["out"], waveform, output.sample_rate, subtype="PCM_16")

        words = aligner.align(waveform, output.sample_rate, chunk["text"])
        print(
            json.dumps(
                {"index": index, "seconds": len(waveform) / output.sample_rate, "words": words}
            ),
            flush=True,
        )


if __name__ == "__main__":
    main()
