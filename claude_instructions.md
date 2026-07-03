# FBL Tournament Live Scoring Application

You are an expert Full Stack Engineer.

Your task is to build a COMPLETE working badminton tournament scoring application.

IMPORTANT

- This application will be used TOMORROW morning in a real tournament.
- Don't over engineer.
- Build the entire project end-to-end.
- Do not stop until everything is complete.
- If multiple files are needed, create them.
- If configuration is required, generate it.
- Assume a fresh machine.
- The application should run immediately after adding Supabase credentials.
- Optimize for SPEED and RELIABILITY.
- Mobile-first design.

---

# Tech Stack

Use ONLY

- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- Supabase
- Vercel

No Docker.

No Prisma.

No NextAuth.

No Clerk.

No authentication libraries.

---

# Authentication

Implement a VERY SIMPLE hardcoded login.

Store users in a JSON file.

```
[
  {
    "username":"admin",
    "password":"admin2026",
    "role":"admin"
  },
  {
    "username":"referee1",
    "password":"court1",
    "role":"court1"
  },
  {
    "username":"referee2",
    "password":"court2",
    "role":"court2"
  },
  {
    "username":"referee3",
    "password":"court3",
    "role":"court3"
  }
]
```

Use cookies/local storage only.

No JWT.

No sessions.

No OAuth.

This is only for one-day tournament usage.

---

# Tournament Name

FBL XD Tournament July 2026

Venue

Playzone

---

# Tournament Format

There are TWO groups.

## Group 1

Phalguni & Rohit

Vignesh & Ananya

Nishant & Parul

Ritik & Amrita

Vinay & Divya

Abhik & Srushti

Peeyush & Diya

---

## Group 2

Joshua & Shruthi

Abhishek & Priya

Hifza & Justin

Akhil & Mansa

Hussain & Ananya

zee & sharika

Kishore & Nalini

---

# League Qualification

Group 1

Top TWO qualify.

Group 2

Top THREE qualify.

Knockout

Semi Final 1

Group1 Rank1

vs

Group2 Rank2

Quarter Final

Group1 Rank2

vs

Group2 Rank3

Semi Final 2

Group2 Rank1

vs

Winner of Quarter Final

Final

Winner Semi1

vs

Winner Semi2

---

# Match Rules

Every match is

21 Golden Point

Meaning

0-0

...

20-20

Next point wins.

Immediately declare winner.

No extra points.

No deuce.

---

# Fixtures

Create every fixture exactly.

Round 1

Court1
Phalguni & Rohit
vs
Abhik & Srushti

Court2
Vignesh & Ananya
vs
Vinay & Divya

Court3
Nishant & Parul
vs
Ritik & Amrita

Round2

Court1
Peeyush & Diya
vs
Abhik & Srushti

Court2
Phalguni & Rohit
vs
Ritik & Amrita

Court3
Vignesh & Ananya
vs
Nishant & Parul

Round3

Court1
Peeyush & Diya
vs
Vinay & Divya

Court2
Abhik & Srushti
vs
Ritik & Amrita

Court3
Phalguni & Rohit
vs
Vignesh & Ananya

Round4

Court1
Abhishek & Priya
vs
Kishore & Nalini

Court2
Hifza & Justin
vs
zee & sharika

Court3
Akhil & Mansa
vs
Hussain & Ananya

Round5

Court1
Joshua & Shruthi
vs
Kishore & Nalini

Court2
Abhishek & Priya
vs
Hussain & Ananya

Court3
Hifza & Justin
vs
Akhil & Mansa

Round6

Court1
Peeyush & Diya
vs
Nishant & Parul

Court2
Ritik & Amrita
vs
Vignesh & Ananya

Court3
Vinay & Divya
vs
Phalguni & Rohit

Round7

Court1
Joshua & Shruthi
vs
Hussain & Ananya

Court2
zee & sharika
vs
Akhil & Mansa

Court3
Kishore & Nalini
vs
Hifza & Justin

Round8

Court1
Peeyush & Diya
vs
Ritik & Amrita

Court2
Vinay & Divya
vs
Nishant & Parul

Court3
Abhik & Srushti
vs
Vignesh & Ananya

Round9

Court1
Joshua & Shruthi
vs
Akhil & Mansa

Court2
Hussain & Ananya
vs
Hifza & Justin

Court3
zee & sharika
vs
Abhishek & Priya

Round10

Court1
Peeyush & Diya
vs
Vignesh & Ananya

Court2
Nishant & Parul
vs
Phalguni & Rohit

Court3
Vinay & Divya
vs
Abhik & Srushti

Round11

Court1
Joshua & Shruthi
vs
Hifza & Justin

Court2
Akhil & Mansa
vs
Abhishek & Priya

Court3
zee & sharika
vs
Kishore & Nalini

Round12

Court1
Peeyush & Diya
vs
Phalguni & Rohit

Court2
Nishant & Parul
vs
Abhik & Srushti

Court3
Ritik & Amrita
vs
Vinay & Divya

Round13

Court1
Joshua & Shruthi
vs
Abhishek & Priya

Court2
Akhil & Mansa
vs
Kishore & Nalini

Court3
Hussain & Ananya
vs
zee & sharika

Round14

Court1
Joshua & Shruthi
vs
zee & sharika

Court2
Kishore & Nalini
vs
Hussain & Ananya

Court3
Abhishek & Priya
vs
Hifza & Justin

---

# Database

Use Supabase.

Tables

## teams

id

group_name

team_name

---

## matches

id

round

court

team_a

team_b

score_a

score_b

status

winner

started_at

completed_at

---

# Seed Data

Automatically seed

- Teams
- Fixtures

The application should be usable immediately.

---

# Home Page (/)

Show

Tournament Name

Venue

Today's Matches

Current Live Matches

Upcoming Matches

Completed Matches

Leaderboard button

Live Scores button

Admin Login button

---

# Login Page

Simple login.

Username

Password

Login button.

Redirect

admin -> dashboard

referee1 -> court1

referee2 -> court2

referee3 -> court3

---

# Referee Screen

Each referee ONLY sees their assigned court.

Example

Court 1 referee only sees

Round1 Court1

Round2 Court1

Round3 Court1

...

Never show other courts.

Display one active match at a time.

Large score.

Very large buttons.

Buttons

+ Team A

- Team A

+ Team B

- Team B

Undo Last Action

Start Match

Finish Match

Reset Match

Next Match

When Finish Match is clicked

Automatically load next scheduled match for that court.

---

# Admin Dashboard

Admin can

View every court

Edit scores

Reset scores

Undo

Change winner

Start any match

Finish any match

Advance to next match

View standings

View knockout bracket

---

# Live Score Page

Public.

No login.

URL

/live

Auto refresh instantly.

Realtime updates.

Display

Court 1

LIVE

Team A

18

16

Team B

---

Court 2

Waiting

Next Match

---

Court 3

Completed

21

19

Winner

---

# Leaderboard

Calculate automatically.

Columns

Rank

Team

Played

Won

Lost

Points For

Points Against

Difference

Sort

Wins DESC

Difference DESC

Points For DESC

Update instantly.

---

# Knockout Page

Auto populate.

Semi Final 1

Group1 Winner

vs

Group2 Runner-up

Quarter Final

Group1 Runner-up

vs

Group2 Third

Semi Final 2

Group2 Winner

vs

Quarter Winner

Final

Winner Semi1

vs

Winner Semi2

---

# Mobile UI

Design specifically for

390 x 844

Everything must fit nicely.

Large touch targets.

Large fonts.

Easy to use outdoors.

No horizontal scrolling.

---

# Theme

Green badminton theme.

Modern cards.

Rounded corners.

Dark Mode support.

---

# Nice UX

Show

LIVE badge

Completed badge

Upcoming badge

Current Round

Current Court

Current Match Number

Progress

Example

Round 7 / 14

Court 2

Match 18 / 42

---

# Sounds

Play a small beep

when score reaches

20-20

Play another beep

when winner is declared.

---

# Winner Animation

When winner is declared

Show

🏆 Winner

Team Name

21 - 18

Small confetti animation.

Automatically continue after 3 seconds.

---

# Realtime

Every score change

Immediately updates

Supabase

Every spectator should see score changes within 1 second.

---

# Deliverables

Generate

✅ Complete Next.js project

✅ Folder structure

✅ SQL schema

✅ Seed script

✅ Supabase integration

✅ Tailwind setup

✅ README

✅ Environment variables

✅ Vercel deployment steps

✅ One-command local run

✅ One-command Vercel deploy

Do not leave TODOs.

Do not leave placeholders.

Generate all code completely.

The final project should be deployable and usable within minutes.