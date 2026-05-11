export interface Quote {
  text: string;
  author: string;
}

const QUOTES: Quote[] = [
  // Marcus Aurelius
  { text: "You have power over your mind, not outside events. Realise this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
  { text: "Do not indulge in dreams of what you do not have, but count up the greatest of the blessings you do have.", author: "Marcus Aurelius" },
  // Seneca
  { text: "We suffer more in imagination than in reality.", author: "Seneca" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "Difficulties strengthen the mind, as labour does the body.", author: "Seneca" },
  { text: "No man was ever wise by chance.", author: "Seneca" },
  { text: "It is not that I'm so smart; it's just that I stay with problems longer.", author: "Seneca" },
  // Naval Ravikant
  { text: "Play long-term games with long-term people.", author: "Naval Ravikant" },
  { text: "Desire is a contract you make with yourself to be unhappy until you get what you want.", author: "Naval Ravikant" },
  { text: "Read what you love until you love to read.", author: "Naval Ravikant" },
  { text: "The most important skill for getting rich is becoming a perpetual learner.", author: "Naval Ravikant" },
  { text: "Spend more time making the big decisions. There are basically three really big ones in life: where you live, who you're with, and what you do.", author: "Naval Ravikant" },
  // Einstein
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "Life is like riding a bicycle. To keep your balance you must keep moving.", author: "Albert Einstein" },
  // Philosophy
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "Life must be understood backwards; but it must be lived forwards.", author: "Søren Kierkegaard" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  // Modern wisdom
  { text: "Stay hungry. Stay foolish.", author: "Steve Jobs" },
  { text: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  // Wit
  { text: "The brain is a wonderful organ. It starts working the moment you get up in the morning and does not stop until you get into the office.", author: "Robert Frost" },
  { text: "I am so clever that sometimes I don't understand a single word of what I am saying.", author: "Oscar Wilde" },
  { text: "To do two things at once is to do neither.", author: "Publilius Syrus" },
];

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

export function getDailyQuote(): Quote {
  return QUOTES[dayOfYear() % QUOTES.length];
}
