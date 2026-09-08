# Interpres

A Latin site: a two-way translator, conjugation and declension tables, a
dictionary, and a tutor. Plain ES modules served from `public/`, a small Node
server in `server/`. No build step.

## Before you start

**Read [LESSONS.md](LESSONS.md).** It records mistakes made on this project and
the rule each one produced. Most of them cost real work. Add to it when
something goes wrong.

The ones that have cost the most, in short:

- Never put a destructive command behind `||`. `git checkout <path>` on an
  uncommitted file is deletion.
- `logs/` is gitignored and is *not* scratch. It is collected data.
- Measure before claiming an improvement. A cherry-picked example is not
  evidence; build the sweep first.
- Work out what a loop costs before running it. The free model tier is 200,000
  tokens a day and one careless corpus run spends all of it.
- Fix the root cause. Four patches around one bad ranking rule moved the score
  by zero.

## Testing

- `npm test` is the offline suite and must stay offline.
- `npm run test:parse` exercises the Latin parser, which needs the network
  because it asks the dictionary what each word can be.
