"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import * as Tone from "tone";
import { Visualizer } from "./Visualizer";

const BEAT_TYPES = [
  "drums",
  "synth",
  "piano",
  "bass",
  "guitar",
  "strings",
  "flute",
  "trumpet",
  "violin",
  "choir",
  "harp",
  "organ",
  "clarinet",
  "cello",
  "saxophone",
  "kick",
  "snare",
  "hihat",
  "percussion",
  "clap",
];
const NOTE_SCALES = [
  "major",
  "minor",
  "pentatonic",
  "blues",
  "chromatic",
  "dorian", // New scale
  "phrygian", // New scale
  "lydian", // New scale
  "mixolydian", // New scale
  "locrian", // New scale
];

interface TonePolySynth {
  triggerAttackRelease: (
    notes: string | string[],
    duration: string,
    time?: number | string,
    velocity?: number
  ) => void;
  toDestination: () => TonePolySynth;
}

interface ToneSequence {
  start: (time?: number) => void;
  dispose: () => void;
}

export default function WordsToBeatsForm() {
  const [text, setText] = useState("");
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedBeatTypes, setSelectedBeatTypes] = useState<string[]>([
    BEAT_TYPES[0],
  ]);
  const [selectedScale, setSelectedScale] = useState(NOTE_SCALES[0]);
  const [synth, setSynth] = useState<TonePolySynth | null>(null);
  const [pattern, setPattern] = useState<string>("");
  const [loopId, setLoopId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const sequenceRef = useRef<ToneSequence | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const initTone = async () => {
      try {
        await Tone.start();
        const newSynth = new Tone.PolySynth(Tone.Synth).toDestination();
        setSynth(newSynth as unknown as TonePolySynth);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error initializing Tone.js:", error);
      }
    };

    initTone();

    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const generatePattern = (input: string): string => {
    if (!input.trim()) return "";

    const cleanedInput = input.toLowerCase().replace(/[^a-z0-9]/g, "");

    let result = "";
    for (let i = 0; i < cleanedInput.length; i++) {
      const charCode = cleanedInput.charCodeAt(i);

      if ("aeiou".includes(cleanedInput[i])) {
        result += "x";
      } else if (charCode % 2 === 0) {
        result += "x";
      } else {
        result += "-";
      }

      if (i % 4 === 3) result += " ";
    }

    return result;
  };

  const generateNotes = (input: string): string[] => {
    if (!input.trim()) return [];

    const scales: Record<string, string[]> = {
      major: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
      minor: ["C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5"],
      pentatonic: ["C4", "D4", "E4", "G4", "A4", "C5"],
      blues: ["C4", "Eb4", "F4", "F#4", "G4", "Bb4", "C5"],
      chromatic: [
        "C4",
        "C#4",
        "D4",
        "D#4",
        "E4",
        "F4",
        "F#4",
        "G4",
        "G#4",
        "A4",
        "A#4",
        "B4",
        "C5",
      ],
      dorian: ["C4", "D4", "Eb4", "F4", "G4", "A4", "Bb4", "C5"],
      phrygian: ["C4", "Db4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5"],
      lydian: ["C4", "D4", "E4", "F#4", "G4", "A4", "B4", "C5"],
      mixolydian: ["C4", "D4", "E4", "F4", "G4", "A4", "Bb4", "C5"],
      locrian: ["C4", "Db4", "Eb4", "F4", "Gb4", "Ab4", "Bb4", "C5"],
    };

    const currentScale = scales[selectedScale] || scales.major;
    const cleanedInput = input.toLowerCase().replace(/[^a-z0-9]/g, "");

    const notes = cleanedInput.split("").map((char) => {
      const charCode = char.charCodeAt(0);
      const index = charCode % currentScale.length;
      return currentScale[index];
    });

    return notes;
  };

  const setupRecording = async () => {
    const audioContext = Tone.getContext().rawContext;
    const dest = (audioContext as AudioContext).createMediaStreamDestination();

    Tone.getDestination().connect(dest);

    const recorder = new MediaRecorder(dest.stream);
    chunksRef.current = [];

    recorder.ondataavailable = (evt) => {
      chunksRef.current.push(evt.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    };

    recorderRef.current = recorder;
  };

  const toggleBeatType = (type: string) => {
    setSelectedBeatTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const stopPlayback = () => {
    Tone.Transport.stop();
    if (sequenceRef.current) {
      sequenceRef.current.dispose();
    }
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      Tone.Transport.stop();
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }

      if (isRecording && recorderRef.current) {
        recorderRef.current.stop();
      }

      setIsPlaying(false);
      return;
    }

    try {
      if (!isLoaded || !synth) {
        try {
          await Tone.start();
          const newSynth = new Tone.PolySynth(Tone.Synth).toDestination();
          setSynth(newSynth as unknown as TonePolySynth);
          setIsLoaded(true);
        } catch (error) {
          console.error("Error initializing audio:", error);
        }
      } else {
        await Tone.start();
      }

      const textToUse = text.trim() || "lorem ipsum dolor sit amet";
      if (!text.trim()) {
        setText(textToUse);
      }

      if (isRecording) {
        await setupRecording();
        if (recorderRef.current) {
          recorderRef.current.start();
        }
      }

      const newPattern = generatePattern(textToUse);
      setPattern(newPattern);

      const notes = generateNotes(textToUse);

      const patternArray = newPattern.replace(/\s/g, "").split("");
      let noteIndex = 0;

      const sequence = new Tone.Sequence(
        (time, idx) => {
          const shouldPlay = patternArray[idx as number] === "x";
          if (shouldPlay && notes[noteIndex]) {
            selectedBeatTypes.forEach((type) => {
              switch (type) {
                case "drums":
                  const noise = new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.005, decay: 0.1, sustain: 0 },
                  }).toDestination();
                  noise.triggerAttackRelease("16n", time);
                  break;
                case "synth":
                  if (synth) {
                    synth.triggerAttackRelease(notes[noteIndex], "8n", time);
                  } else {
                    console.error("Synth is not initialized.");
                  }
                  break;
                case "piano":
                  const piano = new Tone.Synth({
                    oscillator: { type: "triangle" },
                    envelope: {
                      attack: 0.01,
                      decay: 0.1,
                      sustain: 0.3,
                      release: 0.6,
                    },
                  }).toDestination();
                  piano.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "bass":
                  const bass = new Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: {
                      attack: 0.05,
                      decay: 0.2,
                      sustain: 0.4,
                      release: 0.8,
                    },
                  }).toDestination();
                  const bassNote = notes[noteIndex].replace(/(\d+)/, (match) =>
                    String(parseInt(match) - 1)
                  );
                  bass.triggerAttackRelease(bassNote, "8n", time);
                  break;
                case "guitar":
                  const guitar = new Tone.Synth({
                    oscillator: { type: "sawtooth" },
                    envelope: {
                      attack: 0.02,
                      decay: 0.2,
                      sustain: 0.5,
                      release: 0.8,
                    },
                  }).toDestination();
                  guitar.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "strings":
                  const strings = new Tone.Synth({
                    oscillator: { type: "square" },
                    envelope: {
                      attack: 0.05,
                      decay: 0.3,
                      sustain: 0.6,
                      release: 1.0,
                    },
                  }).toDestination();
                  strings.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "flute":
                  const flute = new Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: {
                      attack: 0.05,
                      decay: 0.2,
                      sustain: 0.5,
                      release: 0.8,
                    },
                  }).toDestination();
                  flute.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "trumpet":
                  const trumpet = new Tone.Synth({
                    oscillator: { type: "square" },
                    envelope: {
                      attack: 0.03,
                      decay: 0.15,
                      sustain: 0.4,
                      release: 0.6,
                    },
                  }).toDestination();
                  trumpet.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "violin":
                  const violin = new Tone.Synth({
                    oscillator: { type: "triangle" },
                    envelope: {
                      attack: 0.1,
                      decay: 0.3,
                      sustain: 0.7,
                      release: 1.2,
                    },
                  }).toDestination();
                  violin.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "choir":
                  const choir = new Tone.Synth({
                    oscillator: { type: "sawtooth" },
                    envelope: {
                      attack: 0.2,
                      decay: 0.4,
                      sustain: 0.8,
                      release: 1.5,
                    },
                  }).toDestination();
                  choir.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "harp":
                  const harp = new Tone.Synth({
                    oscillator: { type: "triangle" },
                    envelope: {
                      attack: 0.02,
                      decay: 0.15,
                      sustain: 0.5,
                      release: 0.7,
                    },
                  }).toDestination();
                  harp.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "organ":
                  const organ = new Tone.Synth({
                    oscillator: { type: "square" },
                    envelope: {
                      attack: 0.05,
                      decay: 0.2,
                      sustain: 0.6,
                      release: 1.0,
                    },
                  }).toDestination();
                  organ.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "clarinet":
                  const clarinet = new Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: {
                      attack: 0.03,
                      decay: 0.1,
                      sustain: 0.4,
                      release: 0.6,
                    },
                  }).toDestination();
                  clarinet.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "cello":
                  const cello = new Tone.Synth({
                    oscillator: { type: "triangle" },
                    envelope: {
                      attack: 0.1,
                      decay: 0.3,
                      sustain: 0.7,
                      release: 1.2,
                    },
                  }).toDestination();
                  cello.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "saxophone":
                  const saxophone = new Tone.Synth({
                    oscillator: { type: "sawtooth" },
                    envelope: {
                      attack: 0.05,
                      decay: 0.2,
                      sustain: 0.5,
                      release: 0.9,
                    },
                  }).toDestination();
                  saxophone.triggerAttackRelease(notes[noteIndex], "8n", time);
                  break;
                case "kick":
                  const kick = new Tone.MembraneSynth().toDestination();
                  kick.triggerAttackRelease("C1", "8n", time);
                  break;
                case "snare":
                  const snare = new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.005, decay: 0.2, sustain: 0 },
                  }).toDestination();
                  snare.triggerAttackRelease("16n", time);
                  break;
                case "hihat":
                  const hihat = new Tone.MetalSynth({
                    harmonicity: 5.1,
                    envelope: { attack: 0.001, decay: 0.1, release: 0.1 },
                    modulationIndex: 32,
                    resonance: 4000,
                    octaves: 1.5,
                  }).toDestination();
                  hihat.triggerAttackRelease("16n", time);
                  break;
                case "percussion":
                  const percussion = new Tone.Synth({
                    oscillator: { type: "square" },
                    envelope: {
                      attack: 0.01,
                      decay: 0.1,
                      sustain: 0.2,
                      release: 0.3,
                    },
                  }).toDestination();
                  percussion.triggerAttackRelease("C4", "8n", time);
                  break;
                case "clap":
                  const clap = new Tone.NoiseSynth({
                    noise: { type: "pink" },
                    envelope: { attack: 0.005, decay: 0.1, sustain: 0 },
                  }).toDestination();
                  clap.triggerAttackRelease("16n", time);
                  break;
                default:
                  if (synth) {
                    synth.triggerAttackRelease(notes[noteIndex], "8n", time);
                  } else {
                    console.error("Synth is not initialized.");
                  }
                  break;
              }
            });
          }

          noteIndex = (noteIndex + 1) % notes.length;
        },
        Array.from({ length: patternArray.length }, (_, i) => i),
        "16n"
      );

      sequence.start(0);
      sequenceRef.current = sequence as unknown as ToneSequence;

      Tone.Transport.start();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error playing sound:", error);
      alert("There was an error playing the sound. Please try again.");
    }
  };

  const handleRandomize = () => {
    stopPlayback();

    const words = [
      "lorem",
      "ipsum",
      "dolor",
      "sit",
      "amet",
      "consectetur",
      "adipiscing",
      "elit",
      "sed",
      "do",
      "eiusmod",
      "tempor",
      "incididunt",
      "ut",
      "labore",
      "et",
      "dolore",
      "magna",
      "aliqua",
    ];

    const randomLength = Math.floor(Math.random() * 10) + 5;
    let randomText = "";

    for (let i = 0; i < randomLength; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      randomText += words[randomIndex] + " ";
    }

    setText(randomText.trim());
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      await setupRecording();
      if (recorderRef.current) {
        recorderRef.current.start();
      }
      setIsRecording(true);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your Beat</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
          <Visualizer
            isPlaying={isPlaying}
            beatType={selectedBeatTypes.join(", ")}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="text-input" className="text-sm font-medium">
            Enter some text to convert to music
          </label>
          <Textarea
            id="text-input"
            placeholder="Type or paste text here..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              stopPlayback();
            }}
            className="min-h-32"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomize}
            className="mt-2 border border-gray-300"
          >
            Randomize Text
          </Button>
        </div>

        <div className="pt-4">
          <label htmlFor="bpm-slider" className="text-sm font-medium">
            Tempo (BPM): {bpm}
          </label>
          <Slider
            id="bpm-slider"
            min={60}
            max={200}
            step={1}
            value={[bpm]}
            onValueChange={(value) => setBpm(value[0])}
            className="border border-gray-300 bg-gradient-to-r from-black to-gray-200 text-white"
          />
        </div>

        <div className="pt-4">
          <Toggle
            pressed={isRecording}
            onPressedChange={toggleRecording}
            className="w-full border border-gray-300"
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecording ? "bg-red-500 animate-pulse" : "bg-gray-300"
                }`}
              ></span>
              {isRecording ? "Recording Enabled" : "Enable Recording"}
            </span>
          </Toggle>
        </div>

        <Tabs
          defaultValue="beatType"
          className="mt-6"
          onValueChange={() => stopPlayback()}
        >
          <TabsList className="grid w-full grid-cols-2 p-0 gap-2">
            <TabsTrigger
              value="beatType"
              className="bg-white data-[state=active]:bg-gray-200 data-[state=active]:shadow-none py-2 border border-gray-300 flex justify-center items-center h-full hover:bg-gray-200"
            >
              Beat Type
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="bg-white data-[state=active]:bg-gray-200 data-[state=active]:shadow-none py-2 border border-gray-300 flex justify-center items-center h-full hover:bg-gray-200"
            >
              Musical Scale
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beatType" className="mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {BEAT_TYPES.map((type) => (
                <Toggle
                  key={type}
                  pressed={selectedBeatTypes.includes(type)}
                  onPressedChange={() => {
                    toggleBeatType(type);
                    stopPlayback();
                  }}
                  className={`w-full justify-center capitalize h-12 border border-gray-300 ${
                    selectedBeatTypes.includes(type)
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium"
                      : "bg-white hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  {type}
                </Toggle>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="scale-select"
                className="text-sm font-medium"
              ></label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {NOTE_SCALES.map((scale) => (
                  <Toggle
                    key={scale}
                    pressed={selectedScale === scale}
                    onPressedChange={() => {
                      setSelectedScale(scale);
                      stopPlayback();
                    }}
                    className="capitalize border border-gray-300"
                  >
                    {scale}
                  </Toggle>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {audioUrl && (
          <div className="mt-4 p-3 border rounded-md">
            <p className="text-sm font-medium mb-2">Recording Available</p>
            <audio
              controls
              src={audioUrl}
              className="w-full"
              onError={() =>
                console.error("Error playing audio. Check audioUrl:", audioUrl)
              }
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" variant="outline" asChild>
                <a
                  href={audioUrl}
                  download={`words-to-beats-${Date.now()}.webm`}
                >
                  Download
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button
          onClick={handlePlayPause}
          className="w-24 bg-black hover:bg-gray-800 text-white border border-gray-300"
          size="lg"
        >
          {isPlaying ? "Stop" : "Play"}
        </Button>
      </CardFooter>
    </Card>
  );
}
