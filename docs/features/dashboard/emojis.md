---
title: Several smaller, more lightweight alternatives
status: current
reviewed: 2026-07-28
tags: [feature, spec]
audience: developer
---

# Several smaller, more lightweight alternatives

to emoji-picker-react exist, focusing on performance, smaller bundle sizes, or unstyled composability.

## Top Lightweight Alternatives

    Frimousse (@liveblocks/frimousse): A lightweight, unstyled, and composable emoji picker for React. It uses primitive components similar to Radix UI, allowing you to build a custom emoji picker.

emoji-picker-element: A memory-efficient, framework-agnostic emoji picker (approx. 12.3kB minified+Brotli). While it's a Web Component, it can be easily used within React applications and is often considered a smaller alternative to feature-heavy pickers.

Emoogle Emoji Picker (@xitanggg/emoogle-emoji-picker): An open-source, React-based emoji picker designed to be a simpler alternative.

emoji-button: A lightweight (not React-specific, but usable) library for adding an emoji picker, created by @kickscondor.

interweave-emoji-picker: A lighter-weight option compared to standard pickers, roughly 40.7kB minified.

## Comparison Table

Library Type Key Features
Frimousse React Unstyled, Composable, Primitive-based
emoji-picker-element Web Component Small, memory-efficient
Emoogle React Easy integration, Open-source
emoji-mart React Very popular, customizable (Slack-like)

## Key Considerations for Smaller Bundles

    Lazy Loading: Regardless of the library chosen, using React's lazy() to load the emoji picker component only when needed will significantly reduce your initial bundle size.
    Native Emojis: Using native emoji support instead of loading custom image sets (like Twitter/Twemoji) drastically reduces performance overhead.
    Tree Shaking: Select libraries that allow tree shaking, such as Frimousse, to only include necessary parts of the library
