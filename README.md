# 🎬 CineMatch - Movie Recommendation System

CineMatch is a premium, interactive, and fully responsive **client-side Movie Recommendation System** designed with a modern cinematic dark theme. It features a content-based recommendation engine that evaluates Jaccard genre similarity, descriptive keywords, and user profiles to present highly relevant movie suggestions instantly.

---

## ✨ Key Features

1. **Content-Based Similarity Engine**: 
   - Dynamically calculates similarity scores between movies using weighted matching across genres (40%), descriptive keywords (40%), rating proximity (10%), and release era (10%).
   - Instantly showcases similar suggestions in the "More Like This" section inside any movie detail panel.

2. **Personalized Vibe & Mood Wizard**:
   - Matches your exact mood vibe (Action & Thrill, Thought-Provoking, Emotional & Deep, Lighthearted & Magic, Mind-Bending Sci-Fi) to an optimized vector profile and suggests the top 4 tailored cinematic hits.

3. **Granular Curated Filtering**:
   - Filter the library by multi-select genre tags, release decade (90s, 2000s, 2010s, 2020s), and minimum IMDb rating using live sliders.
   - Fuzzy search through titles, directors, and keywords.

4. **Persistent Watchlist**:
   - Save your custom curation directly to a watchlist backed by `localStorage` which dynamically synchronizes status across card bookmarks and detail buttons.

5. **Premium Glassmorphic UI**:
   - Built with deep velvet colors, neon accents, elegant Outfit typography, and custom micro-animations (card hover scales, transitions, backdrop-blurred overlays).

---

## 🛠️ Technology Stack

- **Core Structure**: HTML5 Semantic Layout
- **Presentation System**: Vanilla CSS3 Custom Variables, Radial Gradients, Backdrop Blurs, Flexbox, & Grid Layouts
- **Interactive Logic**: Vanilla Modern ES6 JavaScript

---

## 🚀 How to Run Locally

Since the application is purely client-side, it has no server dependencies or package builds. Simply open `index.html` in any modern web browser to launch!

For the best experience, you can serve it locally using a simple HTTP server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

Then visit `http://localhost:8000` or the corresponding local URL.

---

## 💡 Recommendation Logic (Under the Hood)

The similarity between any two movies $A$ and $B$ is calculated as:

$$\text{Similarity}(A, B) = 0.4 \cdot \text{Genre}(A, B) + 0.4 \cdot \text{Keywords}(A, B) + 0.1 \cdot \text{Rating}(A, B) + 0.1 \cdot \text{Era}(A, B)$$

Where:
* **Genre Similarity** is measured using the Jaccard index: $\frac{|G_A \cap G_B|}{|G_A \cup G_B|}$.
* **Keyword Similarity** is measured similarly over descriptive keywords.
* **Rating & Era** utilize linear distance decay metrics normalized to maximum limits.
