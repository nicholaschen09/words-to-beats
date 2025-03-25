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

const BEAT_TYPES = ["drums", "synth", "piano", "bass", "guitar", "strings"]; // Added more instruments
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
  const [selectedBeatTypes, setSelectedBeatTypes] = useState<string[]>([
    BEAT_TYPES[0],
  ]); // Allow multiple selections
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
            selectedBeatTypes.forEach((type) => {
              switch (type) {
                case "drums":
                  // For drums, we'll use a noise synth with different envelopes
                  const noise = new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.005, decay: 0.1, sustain: 0 },
                  }).toDestination();
                  noise.triggerAttackRelease("16n", time);
                  break;
                case "synth":
                  // Ensure synth is not null before using it
                  if (synth) {
                    synth.triggerAttackRelease(notes[noteIndex], "8n", time);
                  } else {
                    console.error("Synth is not initialized.");
                  }
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
        {/* Visualizer */}
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
              stopPlayback(); // Stop playback when text is edited
            }}
            className="min-h-32"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomize}
            className="mt-2 border border-gray-300" // Add gray outline
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
            className="border border-gray-300 bg-gradient-to-r from-black via-gray-800 to-gray-600 text-white" // Black gradient styling
          />
        </div>

        <div className="pt-4">
          <Toggle
            pressed={isRecording}
            onPressedChange={toggleRecording}
            className="w-full border border-gray-300" // Add gray outline
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
            {" "}
            {/* Removed bg-gray-100 */}
            <TabsTrigger
              value="beatType"
              className="bg-white data-[state=active]:bg-gray-200 data-[state=active]:shadow-none py-2 border border-gray-300 flex justify-center items-center h-full hover:bg-gray-200" // Updated active state to light gray
            >
              Beat Type
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="bg-white data-[state=active]:bg-gray-200 data-[state=active]:shadow-none py-2 border border-gray-300 flex justify-center items-center h-full hover:bg-gray-200" // Updated active state to light gray
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
                    stopPlayback(); // Stop playback when beat type is changed
                  }}
                  className={`w-full justify-center capitalize h-12 border border-gray-300 ${
                    selectedBeatTypes.includes(type)
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium"
                      : "bg-white hover:bg-gray-50 text-gray-600"
                  }`} // Add gray outline
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
                      stopPlayback(); // Stop playback when a musical scale is clicked
                    }}
                    className="capitalize border border-gray-300" // Add gray outline
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
          className="w-24 bg-black hover:bg-gray-800 text-white border border-gray-300" // Black background and dark gray hover
          size="lg"
        >
          {isPlaying ? "Stop" : "Play"}
        </Button>
      </CardFooter>
    </Card>
  );
}
