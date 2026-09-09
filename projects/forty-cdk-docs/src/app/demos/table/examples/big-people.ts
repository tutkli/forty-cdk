import type { Person } from './people';

const ROLES = ['Engineer', 'Researcher', 'Analyst', 'Designer', 'Manager', 'Intern'];
const DEPTS = ['Platform', 'Research', 'Aerospace', 'Compilers', 'Growth', 'Security'];
const CITIES = ['London', 'Berlin', 'Tokyo', 'Austin', 'Madrid', 'Toronto', 'Oslo', 'Lagos'];
const FIRST = ['Ada', 'Alan', 'Grace', 'Edsger', 'Barbara', 'Donald', 'Katherine', 'Tim'];
const LAST = ['Lovelace', 'Turing', 'Hopper', 'Dijkstra', 'Liskov', 'Knuth', 'Johnson', 'Lee'];

export function makePerson(i: number): Person {
  return {
    id: i + 1,
    name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]} ${i + 1}`,
    role: ROLES[i % ROLES.length]!,
    dept: DEPTS[(i * 2) % DEPTS.length]!,
    location: CITIES[(i * 5) % CITIES.length]!,
  };
}

export function makePeople(start: number, length: number): Person[] {
  return Array.from({ length }, (_, k) => makePerson(start + k));
}
