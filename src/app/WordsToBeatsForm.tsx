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
import { Visualizer } from "./Visualizer"; // Fixed import statement

const BEAT_TYPES = ["drums", "synth", "piano", "bass"];
const NOTE_SCALES = ["major", "minor", "pentatonic", "blues", "chromatic"];

// Define TypeScript interfaces
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
  const [selectedBeatType, setSelectedBeatType] = useState(BEAT_TYPES[0]);
  const [selectedScale, setSelectedScale] = useState(NOTE_SCALES[0]);
  const [synth, setSynth] = useState<TonePolySynth | null>(null);
  const [pattern, setPattern] = useState<string>("");
  const [loopId, setLoopId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const sequenceRef = useRef<ToneSequence | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Initialize Tone.js
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
      // Clean up
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  // Clean up audio URL when component unmounts or when audioUrl changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Update BPM when it changes
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Function to convert text to musical patterns
  const generatePattern = (input: string): string => {
    if (!input.trim()) return "";

    // Simple algorithm to convert text to a rhythmic pattern
    // Each character will be mapped to either 'x' (play) or '-' (rest)
    const cleanedInput = input.toLowerCase().replace(/[^a-z0-9]/g, "");

    let result = "";
    for (let i = 0; i < cleanedInput.length; i++) {
      // Get character code and use it to determine if we play a note or rest
      const charCode = cleanedInput.charCodeAt(i);

      // For vowels, let's use 'x' (play)
      // For consonants, use alternate between 'x' and '-'
      if ("aeiou".includes(cleanedInput[i])) {
        result += "x";
      } else if (charCode % 2 === 0) {
        result += "x";
      } else {
        result += "-";
      }

      // Add some spaces to create a more interesting rhythm
      if (i % 4 === 3) result += " ";
    }

    return result;
  };

  // Function to convert text to musical notes
  const generateNotes = (input: string): string[] => {
    if (!input.trim()) return [];

    // Different scales for different modes
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
    };

    const currentScale = scales[selectedScale] || scales.major;
    const cleanedInput = input.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Map each character to a note in the selected scale
    const notes = cleanedInput.split("").map((char) => {
      const charCode = char.charCodeAt(0);
      const index = charCode % currentScale.length;
      return currentScale[index];
    });

    return notes;
  };

  const setupRecording = async () => {
    // Get the audio context and create a media stream destination node
    const audioContext = Tone.getContext().rawContext;
    const dest = (audioContext as AudioContext).createMediaStreamDestination();

    // Connect Tone.js master output to the media stream destination
    Tone.getDestination().connect(dest);

    // Create a media recorder that records the output from Tone.js
    const recorder = new MediaRecorder(dest.stream);

    // Set up event handlers for recording
    chunksRef.current = [];

    recorder.ondataavailable = (evt) => {
      chunksRef.current.push(evt.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setIsRecording(false);
    };

    recorderRef.current = recorder;
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      // Stop playback
      Tone.Transport.stop();
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }

      // Stop recording if active
      if (isRecording && recorderRef.current) {
        recorderRef.current.stop();
      }

      setIsPlaying(false);
      return;
    }

    try {
      // Initialize Tone.js if it hasn't been yet
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

      // Ensure we have text to convert
      const textToUse = text.trim() || "lorem ipsum dolor sit amet";
      if (!text.trim()) {
        setText(textToUse);
      }

      // Set up recording if enabled
      if (isRecording) {
        await setupRecording();
        if (recorderRef.current) {
          recorderRef.current.start();
        }
      }

      // Generate a pattern from the text
      const newPattern = generatePattern(textToUse);
      setPattern(newPattern);

      // Generate notes from the text
      const notes = generateNotes(textToUse);

      // Create a sequence of notes and rests based on the pattern
      const patternArray = newPattern.replace(/\s/g, "").split("");
      let noteIndex = 0;

      // Create a sequence that will play the pattern
      const sequence = new Tone.Sequence(
        (time, idx) => {
          const shouldPlay = patternArray[idx as number] === "x";
          if (shouldPlay && notes[noteIndex]) {
            // Play the note based on the selected beat type
            switch (selectedBeatType) {
              case "drums":
                // For drums, we'll use a noise synth with different envelopes
                const noise = new Tone.NoiseSynth({
                  noise: { type: "white" },
                  envelope: { attack: 0.005, decay: 0.1, sustain: 0 },
                }).toDestination();
                noise.triggerAttackRelease("16n", time);
                break;
              case "synth":
                // For synth, use the polySynth
                synth.triggerAttackRelease(notes[noteIndex], "8n", time);
                break;
              case "piano":
                // For piano simulation
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
                // For bass simulation
                const bass = new Tone.Synth({
                  oscillator: { type: "sine" },
                  envelope: {
                    attack: 0.05,
                    decay: 0.2,
                    sustain: 0.4,
                    release: 0.8,
                  },
                }).toDestination();
                // Play an octave lower
                const bassNote = notes[noteIndex].replace(/(\d+)/, (match) =>
                  String(parseInt(match) - 1)
                );
                bass.triggerAttackRelease(bassNote, "8n", time);
                break;
              default:
                synth.triggerAttackRelease(notes[noteIndex], "8n", time);
            }
          }

          // Move to the next note in the sequence
          noteIndex = (noteIndex + 1) % notes.length;
        },
        Array.from({ length: patternArray.length }, (_, i) => i),
        "16n"
      );

      // Start the sequence
      sequence.start(0);
      sequenceRef.current = sequence as unknown as ToneSequence;

      // Start the transport
      Tone.Transport.start();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error playing sound:", error);
      alert("There was an error playing the sound. Please try again.");
    }
  };

  const handleRandomize = () => {
    // Generate random Lorem Ipsum-like text
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

    const randomLength = Math.floor(Math.random() * 10) + 5; // 5-15 words
    let randomText = "";

    for (let i = 0; i < randomLength; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      randomText += words[randomIndex] + " ";
    }

    setText(randomText.trim());
  };

  const toggleRecording = () => {
    // Toggle recording state
    setIsRecording(!isRecording);

    // Clear previous recording
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your Beat</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Visualizer */}
        <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
          <Visualizer isPlaying={isPlaying} beatType={selectedBeatType} />
        </div>

        <div className="space-y-2">
          <label htmlFor="text-input" className="text-sm font-medium">
            Enter some text to convert to music
          </label>
          <Textarea
            id="text-input"
            placeholder="Type or paste text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-32"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomize}
            className="mt-2"
          >
            Randomize Text
          </Button>
        </div>

        <Tabs defaultValue="beatType" className="mt-6">
          <TabsList className="grid w-full grid-cols-2 p-0 bg-gray-100">
            <TabsTrigger
              value="beatType"
              className="data-[state=active]:bg-white data-[state=active]:shadow-none py-2"
            >
              Beat Type
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="data-[state=active]:bg-white data-[state=active]:shadow-none py-2"
            >
              Advanced Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beatType" className="mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {BEAT_TYPES.map((type) => (
                <Toggle
                  key={type}
                  pressed={selectedBeatType === type}
                  onPressedChange={() => setSelectedBeatType(type)}
                  className={`w-full justify-center capitalize h-12 ${
                    selectedBeatType === type
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
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="scale-select" className="text-sm font-medium">
                Musical Scale
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {NOTE_SCALES.map((scale) => (
                  <Toggle
                    key={scale}
                    pressed={selectedScale === scale}
                    onPressedChange={() => setSelectedScale(scale)}
                    className="capitalize"
                  >
                    {scale}
                  </Toggle>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Toggle
                pressed={isRecording}
                onPressedChange={toggleRecording}
                disabled={isPlaying}
                className="w-full"
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

              {audioUrl && (
                <div className="mt-4 p-3 border rounded-md">
                  <p className="text-sm font-medium mb-2">
                    Recording Available
                  </p>
                  <audio controls src={audioUrl} className="w-full" />
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button
          onClick={handlePlayPause}
          className="w-24 bg-violet-400 hover:bg-violet-500 text-white"
          size="lg"
        >
          {isPlaying ? "Stop" : "Play"}
        </Button>
      </CardFooter>
    </Card>
  );
}
