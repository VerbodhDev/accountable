And welcome finally to the build stage, the stage we know so well.

It's time to take off that product owner hat and firmly put on the engineer hat.

Build stage. Let's do this.

But just when you finally thought we were about to do some coding,

we're going to do more planning.

The first part of the build stage is to write another document, plan.md.

This is the kind of document that you might have started with in the past.

This is one which is actually going to lay out what's going to happen in what order.

And it's going to have these different sections.

What's going to change, the order of work, the risks, and the proof.

How you will know that it's worked properly.

And again, in Anthropic's documentation, they suggest starting this in plan mode,

but that's not so common these days.

I want to write files directly into the repo, not into the .claude directory.

So I'm just going to use normal auto mode, and that is very common.

If you tell Claude not to write code yet, it won't do it.

And this is a big moment for you and me.

This is the moment that we have to show our judgment.

Our judgment as engineers.

We have to use our judgment to figure out how much detail do we want to go into,

how much detail do we want to review,

and what kind of pointed questions do we want to ask the coding agent

to satisfy ourselves that it's approaching this the right way.

And even if you're not technical, you can still ask the right pointed questions.

You can be the boss.

And for me, for example, I don't have great knowledge of the front end.

But I can ask questions.

I can say, I'm not a front-end expert,

but justify to me why you're making this choice.

Explain it in non-technical terms with evidence.

Those are the kinds of hard questions that you have to ask.

So we're now going to go and prompt Claude to read the documents it's done so far

and then write the document in this format.

And then we're going to try and question it

and then revise it as necessary before we commit it.

And once we've done that, it's going to be time to build the MVP.

It's finally time to build it.

And so we will start fresh.

We will make sure we're on the right branch,

clear the session and ask it to build.

And that is when we will actually finally get to writing some code.

And at the end of that, we will commit it.

So here I am. I'm back in the repo.

I'm back in Claude Code.

And I'm telling it now to read the intent document, the spec document,

and write a plan document with the four sections that we mentioned.

Let's go.

And off it goes. Let's see what it makes of this.

It's going to start by reading the documents.

I should hope so. It's then going to write its plan.

I'll see you when it's done.

And it's completed the plan in just under 15 minutes.

And it's gone through and set up eight different phases of delivery.

It's made some corrections to the spec,

but it didn't edit the spec document because we told it

to only change the plan document.

So it's put that in the plan document.

It's mentioned a risk about what happens if you lose Wi-Fi.

That seems very precise of it.

And it only remains for us to check out the plan document.

So here is the plan document.

And again, it's quite a long document.

Let me just scroll through it so you get a sense of it.

There's quite a lot going on with the various phases to be delivered.

Let's take a quick peek through.

Just as we asked, the first section is about files that change.

It mentions existing files that will change,

and then the new files that will come in,

a lot of the scaffolding that will be needed,

the back-end files that will be created, the front-end files that will be created,

and new end-to-end tests that will be created.

And there's some corrections to the spec, as it told us.

It's listed them out here.

Let me have a look at it.

Okay, that seems fine.

Say how halves round up.

See risk 3.

All right, this all seems like the kinds of decisions we would like

to see it making. And then order of work.

Eight phases done in this order.

For each phase, it tells it how to begin work on that phase.

And this is really nice.

You can see that with each phase,

it's put underneath it which requirements are satisfied by that phase.

It's like a traceability that it's got here.

I wonder if it's done it completely.

Now we've got phase one is a shell that runs.

Phase two is the sort of database and sample data.

Then build the API. Then the tables and forms.

Then the record pages and timelines.

The pipeline and the dashboard,

then a finish the build in which it's doing a lot of the testing and the

end-to-end testing. Those make complete sense to me for phases.

Now let's take a look at the risks which is put with the most serious ones first.

The first risk is that a test might wipe real data.

It seems that it's not like that's an issue,

it's just something that could happen.

And so it's put stuff in phase one to make sure that it's careful.

There's a risk about losing Wi-Fi, that's fine for an MVP.

A risk about rounding off by a dollar because of Python and JavaScript

is clever that identified it, but fine for an MVP.

The dragging being slow at 500 deals is fine.

Entering on a card, it's fine.

Could start a drag, okay?

It's good that it's identifying these things.

It's obviously going to try and cater for them.

That's fine.

Interrupted first start leaves an empty app for good.

Okay, these are all starting to get a bit pedantic.

I will read through these and make sure that none of them cause me undue concern.

Okay, they all seem fine.

And then here is the proof section,

which has everything that we'll do to make sure that everything is tested thoroughly.

The end-to-end tests, the unit tests, all of them are covered here.

That seems very good indeed.

And then at the end are the by-hand tests that will be your responsibility and mine.

So actually the one challenge I have is not a technical challenge at all.

It's more of a business challenge that I am interested in this traceability point.

I see that in the plan document it identifies which spec IDs are delivered

at each point. But has it gone back and done the reverse?

Has it gone through spec ID by spec ID and said when that gets delivered

to make sure everything is complete and we have full traceability?

So I'm going to ask it now to make that table for me so I can be satisfied

that all the functionality is indeed getting delivered.

And so it turns out just asking that question did

in fact uncover some problems.

It's an example, I guess, of where judgment worked in my favor.

Just having that sense that that was a good question to ask.

Turns out that it had a script to do this traceability for it,

but it was a bit of a hand wavy script and it made some mistakes.

So when it went through,

it discovered that there was a bunch of things that were missing or incomplete.

And the bottom line is that there was no functionality missing from the plan,

I think is the good news.

The bad news is it had put things in the wrong order in some places

that wouldn't have worked.

It would have discovered that when it was building, of course.

And then some of the tests weren't fully covering all of the requirements.

So there was some missing functionality in the testing.

And that has now all been fixed.

And it points out there's still opportunity for mistake because this

is based on its read of the requirements and the plan.

Fair enough. Okay, one more question.

So I was looking at the way that it's done its packaging,

and I noticed that it looks like it's quite a flat structure

where there's an awful lot of Python modules,

maybe with different concerns in the same package.

So I'm going to say to it,
==================
are you satisfied that the packaging structure is well designed

and a good foundation for the future?

In the back end, there seem to be a lot of modules in app.

I haven't checked the front end.

I don't want over-engineered abstractions or helpers,

but I do want a sensible foundation for future expansion.
============================
That's my probing question.

Let's see if it decides to defend the way it's done it,

or whether it wants to make some changes.

Okay, here's the answer.

No, I wasn't satisfied.

So I've changed the layout.

You were right that app looked crowded.

I mean, I sort of knew that.

And the front end had the same problem.

And I suspected that, although I didn't know enough to know.

The trouble wasn't the number of files.

Fair enough. Plumbing and yeah, okay.

Okay. Plumbing and CRM code were mixed together.

The mixture of concerns.

I did see that.

With nowhere obvious for the ERP work that the intent promises in the future.

Fair enough. So let's see.

It's reorganized things.

Accountable with a CRM.

That seems like a decent approach.

Migrations is a separate package.

Those three at the top.

Fine. And then the front end has been organized.

So it explains here what has changed.

So this seems perfectly sensible.

But I'm pleased to say, it also says that it didn't go too far.

It didn't have things like a separate folder per record type.

It's a common FastAPI pattern,

but it would be way over the top for this project.

I do agree. And then it also says one tables.py, one schemas.py.

That seems perfectly reasonable for an MVP at this point.

So I think that's great.

I think this has got to a better place.

And yeah, I mean,

I don't think it would be a disaster if it had done it the way that it wanted

to do it originally.

It's not like that's a big deal.

But I do think this is better.

And so I'm pleased we've done this.

I'd say this is an example, not of me necessarily having a judgment,

but perhaps taste.

But your taste might be different and that's why it's great

that you're doing this as well as me.

And you should feel free to take it in a different direction.

Take a look through it.

Use your judgment.

Decide how deep to go and then use your taste to correct it where needed.

And then when you're ready,

it will be time to commit and then finally get to it writing some code.

All right, so git status as usual.

And then I'm pleased to see that it's the plan that's ready and that's it

and the status of course.

git add . to stage it, git commit.

I can just paste in what I already got.

There we go. And we have committed.

It's time to build.

So perhaps the time when the engineer, you and me,

adds the most value is the last few minutes.

It's that questioning of the plan and digging in.

That's the new engineering.

What we're going to do now is going to be not a lot of my hands moving.

I'm going to do /clear in Claude Code.

To clear the context, I'm going to paste in the command, implement plan.md,

following its order of work, write the tests in the proof section,

and run them as you go.

Leave the commits to me.

That's it. Claude Code

is off. I will see you in a moment.

Just slightly longer than a moment later.

It's three hours later or so.

I left it running. It's done its thing.

It did an awful lot of testing of dragging and dropping.

That was obviously problematic for it, but nonetheless,

it kept working and it's done.

We've got about 3,000 lines of Python code written,

not including comments and empty lines,

and about 7,000 lines of JavaScript TypeScript, all here in this repo.

Now this is now an important moment for you and me to dig in,

be the engineers being accountable for the quality of this code.

But we're going to do a terrible thing and we're going to skip it.

We're going to come back to this tomorrow with the topic of harness engineering

and putting in place the harness that guarantees code quality.

So I'm going to ask you to look the other way just for a moment.

We're going to commit this.

We're going to move on to testing and see how it looks.

So I use the plus button to start a new terminal.

I'm typing git status to see what we've got here.

We've got quite a lot.

I'm going to say git add . to put everything in staging.

git commit, "Build: the MVP".

There we go. Lots of things have been added.

Okay, that wraps up the build phase.

We're going on to the test phase.