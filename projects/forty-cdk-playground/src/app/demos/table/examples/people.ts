export interface Person {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly dept: string;
  readonly location: string;
}

export const PEOPLE: readonly Person[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Engineer', dept: 'Platform', location: 'London' },
  { id: 2, name: 'Alan Turing', role: 'Researcher', dept: 'Research', location: 'Manchester' },
  { id: 3, name: 'Grace Hopper', role: 'Engineer', dept: 'Compilers', location: 'New York' },
  { id: 4, name: 'Katherine Johnson', role: 'Analyst', dept: 'Aerospace', location: 'Hampton' },
  { id: 5, name: 'Edsger Dijkstra', role: 'Researcher', dept: 'Research', location: 'Rotterdam' },
  { id: 6, name: 'Barbara Liskov', role: 'Professor', dept: 'Research', location: 'Boston' },
  { id: 7, name: 'Margaret Hamilton', role: 'Engineer', dept: 'Aerospace', location: 'Boston' },
  { id: 8, name: 'Tim Berners-Lee', role: 'Engineer', dept: 'Platform', location: 'London' },
  { id: 9, name: 'Donald Knuth', role: 'Professor', dept: 'Compilers', location: 'Stanford' },
];

export type PersonColumn = 'name' | 'role' | 'dept' | 'location';

export const COLUMN_LABELS: Record<PersonColumn, string> = {
  name: 'Name',
  role: 'Role',
  dept: 'Department',
  location: 'Location',
};

export function personField(person: Person, column: PersonColumn): string {
  return person[column];
}
