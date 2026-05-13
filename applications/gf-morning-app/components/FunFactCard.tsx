"use client";
import { useState } from "react";

const FACTS = [
  "If you shuffle a deck of cards properly, the exact order has almost certainly never existed before in history — and never will again. The number of combinations (52!) is larger than the number of atoms in the observable universe. 🃏",
  "A single strand of human DNA, if uncoiled, would stretch about 2 metres. Your body has ~37 trillion cells — laid end-to-end, your DNA would reach the sun and back ~70 times. 🧬",
  "There are more possible iterations of a game of chess than there are atoms in the observable universe — and most games are over in under 40 moves. ♟️",
  "The Great Wall of China is NOT visible from space with the naked eye. This is a myth — astronauts have confirmed it. You'd need eyesight 17,000× better than 20/20 vision. 🌍",
  "Cleopatra lived closer in time to the Moon landing (1969) than to the construction of the Great Pyramid (~2560 BC). History is not distributed how we imagine. 🏺",
  "Every atom in your body was forged inside a star that exploded before our solar system existed. You are literally made of stardust — and so is everything else. ⭐",
  "If you removed all the empty space from atoms in all humans on Earth, the remaining matter would fit inside a sugar cube. Everything you see is mostly emptiness. 🎲",
  "Nintendo was founded in 1889 — the same year the Eiffel Tower was built. They were making playing cards before electric light was common. 🃏",
  "The Woolly Mammoth was still alive when the Great Pyramids were being built. Extinction timelines are not what you think. 🦣",
  "There are more trees on Earth than stars in the Milky Way. Estimates put Earth's tree count at ~3 trillion; the Milky Way has ~300 billion stars. 🌳",
  "Your brain generates about 20 watts of electrical power — enough to dimly light an LED bulb. Thinking hard doesn't use noticeably more energy. 🧠",
  "A day on Venus is longer than a year on Venus. It rotates so slowly it completes one full orbit of the Sun before completing one full rotation on its own axis. 🌑",
  "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs — and it was still edible. 🍯",
  "Oxford University is older than the Aztec Empire. Teaching began there around 1096 AD. The Aztec empire started in 1428 AD. 🎓",
  "If you folded a piece of paper 42 times, the stack would reach the Moon. Each fold doubles the thickness — exponential growth is brutally non-intuitive. 📄",
  "An octopus has three hearts, blue blood, and nine brains (one central + one per arm). The arms can taste and touch simultaneously. 🐙",
  "The fax machine was invented in 1843 — before the telephone. Alexander Bain patented it over 30 years before Bell's phone call. 📠",
  "Alaska is simultaneously the westernmost, northernmost, AND easternmost state in the US. Part of it crosses the 180° meridian into the Eastern Hemisphere. 🗺️",
  "A bolt of lightning is about 5 times hotter than the surface of the Sun. The surface of the Sun is ~5,500°C; lightning reaches ~27,700°C. ⚡",
  "Humans share ~60% of their DNA with a banana. We share ~98.7% with chimpanzees. DNA tells you a lot — and nothing you expected. 🍌",
  "The mantis shrimp can punch with the acceleration of a bullet — fast enough to boil the water around it. Their clubs can withstand years of this without breaking. 🦐",
  "Saturn's rings are only about 10 metres thick on average, but span 280,000 km wide. If scaled to the size of a football field, they'd be thinner than a sheet of paper. 🪐",
  "The total weight of all ants on Earth was estimated (until recently) to equal or exceed the total weight of all humans. They are the most successful animal group by biomass. 🐜",
  "Sharks are older than trees. Sharks evolved ~450 million years ago; trees appeared ~350 million years ago. Sharks predate wood. 🦈",
  "There are more possible sudoku grids than there are grains of sand on Earth. There are 6,670,903,752,021,072,936,960 valid sudoku puzzles. 🔢",
  "The Eiffel Tower is 15cm taller in summer than winter due to thermal expansion. Metal expands when it heats up — and the tower has lots of it. 🗼",
  "You can't hum while holding your nose closed. Try it. The air needed to create a sound has nowhere to go. 🤐",
  "The word 'set' has the most meanings of any word in the English language — the Oxford English Dictionary lists over 430 distinct definitions. 📚",
  "A teaspoon of neutron star material would weigh approximately 900 times the weight of the Great Pyramid of Giza (~6 billion tonnes). 🌑",
  "The Voyager 1 spacecraft, launched in 1977, is now over 23 billion km from Earth — still operational, and it can communicate with us using 23 watts of power. 🚀",
  "There are more ways to arrange 20 books on a shelf than there have been seconds since the Big Bang. Factorial growth is incomprehensible. 📖",
  "Wombat poo is cube-shaped. No other animal produces cube-shaped faeces. Scientists spent years figuring out how — it's produced that way inside the intestine. 🟫",
  "The loudest sound in recorded history was the 1883 eruption of Krakatoa — heard 5,000 km away in Rodrigues Island. Sound at that range is essentially impossible. 🌋",
  "Pluto hasn't completed a single orbit of the Sun since it was discovered in 1930. Its year is 248 Earth years long. ☄️",
  "There are more atoms in a grain of sand than there are grains of sand on all of Earth's beaches. Atoms are inconceivably small. 🏖️",
];

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export default function FunFactCard() {
  const [offset, setOffset] = useState(0);
  const idx = (dayOfYear() + offset) % FACTS.length;
  const fact = FACTS[idx];

  function refresh() {
    setOffset((o) => (o + 1) % FACTS.length);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0 mt-0.5">💡</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-1">Fun Fact</p>
            <p className="text-sm text-slate-700 leading-relaxed">{fact}</p>
          </div>
          <button
            onClick={refresh}
            title="Show another fact"
            className="flex-shrink-0 mt-0.5 w-7 h-7 flex items-center justify-center rounded-full bg-sky-100 hover:bg-sky-200 text-sky-500 hover:text-sky-700 transition-all active:scale-90 text-sm"
          >
            ↺
          </button>
        </div>
      </div>
    </div>
  );
}
