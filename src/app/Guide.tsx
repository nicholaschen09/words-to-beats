"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export function Guide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-8 mb-4">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-4 mx-auto block border-gray-300 hover:bg-gray-50"
      >
        {isOpen ? "Hide Guide" : "How It Works"}
      </Button>

      {isOpen && (
        <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm max-w-4xl mx-auto">
          <h3 className="text-xl font-bold mb-4">
            How Words to Beats Works
          </h3>

          <Accordion type="single" collapsible>
            <AccordionItem value="text-to-pattern">
              <AccordionTrigger>Text to Rhythm Patterns</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">
                  Your text is converted into a rhythm pattern where:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Vowels (a, e, i, o, u) always produce a beat (x)</li>
                  <li>Consonants are converted to either beats (x) or rests (-) based on their character code</li>
                  <li>The pattern is divided into groups of 4 characters to create a more musical structure</li>
                </ul>
                <p className="mt-4 mb-1 font-medium">Example:</p>
                <p className="font-mono bg-muted p-2 rounded">
                  "hello" → "x-xx-"
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="text-to-notes">
              <AccordionTrigger>Text to Musical Notes</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">
                  Each character in your text is mapped to a musical note in the selected scale:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The character's ASCII code determines which note in the scale is played</li>
                  <li>Different musical scales (major, minor, pentatonic, etc.) provide different moods</li>
                </ul>
                <p className="mt-4 mb-1 font-medium">Example with Major scale:</p>
                <p className="font-mono bg-muted p-2 rounded">
                  "hello" → [E4, C4, G4, G4, C5]
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="beat-types">
              <AccordionTrigger>Beat Types</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">
                  Choose from different sound textures to match your mood:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><span className="font-medium">Drums</span>: Percussive sounds using noise synthesis</li>
                  <li><span className="font-medium">Synth</span>: Classic synthesizer sound with a smooth tone</li>
                  <li><span className="font-medium">Piano</span>: Softer, more melodic sound similar to a piano</li>
                  <li><span className="font-medium">Bass</span>: Low-frequency tones that provide a foundation</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="advanced">
              <AccordionTrigger>Advanced Settings</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Fine-tune your musical output:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><span className="font-medium">Tempo (BPM)</span>: Control the speed of your beat</li>
                  <li><span className="font-medium">Musical Scale</span>: Change the mood of your music
                    <ul className="list-disc pl-6 mt-1">
                      <li>Major: Bright and happy</li>
                      <li>Minor: Melancholic and sad</li>
                      <li>Pentatonic: Smooth and versatile</li>
                      <li>Blues: Soulful with tension</li>
                      <li>Chromatic: Includes all possible notes</li>
                    </ul>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tips">
              <AccordionTrigger>Tips for Better Results</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Try shorter phrases for more rhythmic patterns</li>
                  <li>Experiment with different beat types for the same text</li>
                  <li>Use text with varied vowel and consonant patterns</li>
                  <li>Try lyrics from your favorite songs for interesting results</li>
                  <li>Use the "Randomize Text" button for inspiration</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}
