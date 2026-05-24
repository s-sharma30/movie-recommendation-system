// Global State
let selectedGenres = [];
let ratingFilter = 7.0;
let decadeFilter = "all";
let searchQuery = "";
let watchlist = JSON.parse(localStorage.getItem("movie_watchlist")) || [];

// Constants
const VIBE_MAPPINGS = {
  "action-thrill": { genres: ["Action", "Thriller", "Adventure"], keywords: ["heist", "vigilante", "gunfights", "chaos", "chase"] },
  "thought-provoking": { genres: ["Sci-Fi", "Drama", "Mystery"], keywords: ["space", "dystopia", "existential", "linguistics", "mind-bending"] },
  "emotional": { genres: ["Drama", "Romance", "Music"], keywords: ["love-story", "grief", "father-daughter", "bittersweet", "obsession"] },
  "lighthearted": { genres: ["Comedy", "Animation", "Adventure"], keywords: ["quirky", "magic", "growing-up", "hotel", "aesthetic"] },
  "mind-bending": { genres: ["Sci-Fi", "Mystery", "Thriller"], keywords: ["dreams", "reality", "time", "multiverse", "simulation", "virtual-reality"] }
};

// Calculate similarity between two movies
function calculateSimilarity(movieA, movieB) {
  if (movieA.id === movieB.id) return 0;

  // 1. Genre Similarity (Weight: 40%)
  const genreIntersection = movieA.genres.filter(g => movieB.genres.includes(g)).length;
  const genreUnion = new Set([...movieA.genres, ...movieB.genres]).size;
  const genreScore = genreUnion > 0 ? (genreIntersection / genreUnion) : 0;

  // 2. Keyword Similarity (Weight: 40%)
  const keywordIntersection = movieA.keywords.filter(k => movieB.keywords.includes(k)).length;
  const keywordUnion = new Set([...movieA.keywords, ...movieB.keywords]).size;
  const keywordScore = keywordUnion > 0 ? (keywordIntersection / keywordUnion) : 0;

  // 3. Rating Proximity (Weight: 10%)
  const ratingDiff = Math.abs(movieA.rating - movieB.rating);
  const ratingScore = Math.max(0, 1 - (ratingDiff / 3.0)); // Highly similar if within 3 points

  // 4. Year/Era Proximity (Weight: 10%)
  const yearDiff = Math.abs(movieA.year - movieB.year);
  const yearScore = Math.max(0, 1 - (yearDiff / 20.0)); // Highly similar if within 20 years

  return (genreScore * 0.4) + (keywordScore * 0.4) + (ratingScore * 0.1) + (yearScore * 0.1);
}

// Calculate similarity between a movie and a custom user profile vector
function calculateProfileSimilarity(movie, profile) {
  // Profile contains: genres (array), keywords (array), minRating (number), era (string)
  
  // Genre Match
  let genreScore = 0;
  if (profile.genres.length > 0) {
    const matched = movie.genres.filter(g => profile.genres.includes(g)).length;
    genreScore = matched / profile.genres.length;
  }

  // Keyword Match
  let keywordScore = 0;
  if (profile.keywords.length > 0) {
    const matched = movie.keywords.filter(k => profile.keywords.includes(k)).length;
    keywordScore = matched / profile.keywords.length;
  }

  // Rating Match (Multiplier)
  const ratingMatch = movie.rating >= profile.minRating ? 1.0 : (movie.rating / profile.minRating);

  return (genreScore * 0.5) + (keywordScore * 0.3) + (ratingMatch * 0.2);
}

// Get recommendations for a specific movie
function getRecommendationsForMovie(targetMovie, limit = 3) {
  return MOVIES_DATA
    .map(movie => ({
      movie,
      score: calculateSimilarity(targetMovie, movie)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.movie);
}

// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
  initializeGenresPanel();
  renderMoviesList();
  renderWatchlist();
  setupEventListeners();
  
  // Initial slide in intro
  const hero = document.querySelector(".hero-banner");
  if (hero) hero.style.opacity = "1";
});

// Setup Event Listeners
function setupEventListeners() {
  // Text Search
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderMoviesList();
    });
  }

  // Rating Filter
  const ratingSlider = document.getElementById("rating-range");
  const ratingVal = document.getElementById("rating-value");
  if (ratingSlider) {
    ratingSlider.addEventListener("input", (e) => {
      ratingFilter = parseFloat(e.target.value);
      ratingVal.textContent = ratingFilter.toFixed(1);
      renderMoviesList();
    });
  }

  // Decade Filter
  const decadeSelect = document.getElementById("decade-select");
  if (decadeSelect) {
    decadeSelect.addEventListener("change", (e) => {
      decadeFilter = e.target.value;
      renderMoviesList();
    });
  }

  // Vibe Buttons (Preference Wizard)
  const vibeButtons = document.querySelectorAll(".vibe-btn");
  vibeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      vibeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      generateVibeRecommendations(btn.dataset.vibe);
    });
  } );

  // Close Modal
  const closeModal = document.querySelector(".modal-close");
  const modal = document.getElementById("movie-modal");
  if (closeModal && modal) {
    closeModal.addEventListener("click", () => {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
    });
    // Click outside modal
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
      }
    });
  }
}

// Initialize Genre Filter Buttons
function initializeGenresPanel() {
  const genresSet = new Set();
  MOVIES_DATA.forEach(movie => {
    movie.genres.forEach(g => genresSet.add(g));
  });

  const genreContainer = document.getElementById("genres-container");
  if (!genreContainer) return;

  genresSet.forEach(genre => {
    const btn = document.createElement("button");
    btn.className = "genre-pill";
    btn.textContent = genre;
    btn.addEventListener("click", () => {
      if (selectedGenres.includes(genre)) {
        selectedGenres = selectedGenres.filter(g => g !== genre);
        btn.classList.remove("active");
      } else {
        selectedGenres.push(genre);
        btn.classList.add("active");
      }
      renderMoviesList();
    });
    genreContainer.appendChild(btn);
  });
}

// Filter and Render Movies
function renderMoviesList() {
  const grid = document.getElementById("movies-grid");
  if (!grid) return;

  grid.innerHTML = "";

  const filteredMovies = MOVIES_DATA.filter(movie => {
    // 1. Genre filter
    if (selectedGenres.length > 0) {
      const hasAllGenres = selectedGenres.every(g => movie.genres.includes(g));
      if (!hasAllGenres) return false;
    }

    // 2. Rating filter
    if (movie.rating < ratingFilter) return false;

    // 3. Decade filter
    if (decadeFilter !== "all") {
      const startYear = parseInt(decadeFilter);
      const endYear = startYear + 9;
      if (movie.year < startYear || movie.year > endYear) return false;
    }

    // 4. Text search
    if (searchQuery.trim() !== "") {
      const matchTitle = movie.title.toLowerCase().includes(searchQuery);
      const matchDirector = movie.director.toLowerCase().includes(searchQuery);
      const matchKeywords = movie.keywords.some(k => k.toLowerCase().includes(searchQuery));
      if (!matchTitle && !matchDirector && !matchKeywords) return false;
    }

    return true;
  });

  if (filteredMovies.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <i class="icon-film"></i>
        <h3>No Movies Found</h3>
        <p>Try adjusting your search filters or tags to discover more cinematic gems!</p>
      </div>
    `;
    return;
  }

  filteredMovies.forEach(movie => {
    const card = createMovieCard(movie);
    grid.appendChild(card);
  });
}

// Create a Movie Card DOM Element
function createMovieCard(movie) {
  const isBookmarked = watchlist.some(m => m.id === movie.id);
  const card = document.createElement("div");
  card.className = "movie-card";
  card.innerHTML = `
    <div class="card-poster">
      <img src="${movie.poster}" alt="${movie.title}" loading="lazy">
      <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="toggleWatchlist(event, ${movie.id})">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      <div class="card-overlay" onclick="openMovieDetails(${movie.id})">
        <span class="view-details-btn">View Details</span>
      </div>
    </div>
    <div class="card-info" onclick="openMovieDetails(${movie.id})">
      <div class="card-header-row">
        <span class="card-year">${movie.year}</span>
        <span class="card-rating">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${movie.rating.toFixed(1)}
        </span>
      </div>
      <h3 class="card-title">${movie.title}</h3>
      <p class="card-genres">${movie.genres.join(" • ")}</p>
    </div>
  `;
  return card;
}

// Generate vibe based recommendations
function generateVibeRecommendations(vibeKey) {
  const vibe = VIBE_MAPPINGS[vibeKey];
  if (!vibe) return;

  const profile = {
    genres: vibe.genres,
    keywords: vibe.keywords,
    minRating: 7.5
  };

  const recommendations = MOVIES_DATA
    .map(movie => ({
      movie,
      score: calculateProfileSimilarity(movie, profile)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.movie);

  const recommendationSection = document.getElementById("vibe-recommendations");
  if (!recommendationSection) return;

  recommendationSection.innerHTML = "";
  
  const title = document.createElement("h3");
  title.className = "section-subtitle";
  title.innerHTML = `Recommended for your <span>${vibeKey.replace("-", " ")}</span> mood:`;
  recommendationSection.appendChild(title);

  const recGrid = document.createElement("div");
  recGrid.className = "vibe-grid";
  recommendations.forEach(movie => {
    const card = createMovieCard(movie);
    recGrid.appendChild(card);
  });
  recommendationSection.appendChild(recGrid);
  recommendationSection.scrollIntoView({ behavior: "smooth" });
}

// Watchlist Toggle
window.toggleWatchlist = function(event, movieId) {
  event.stopPropagation();
  const movie = MOVIES_DATA.find(m => m.id === movieId);
  if (!movie) return;

  const index = watchlist.findIndex(m => m.id === movieId);
  if (index > -1) {
    watchlist.splice(index, 1);
  } else {
    watchlist.push(movie);
  }

  localStorage.setItem("movie_watchlist", JSON.stringify(watchlist));
  
  // Re-render
  renderMoviesList();
  renderWatchlist();
};

// Render Watchlist Panel
function renderWatchlist() {
  const container = document.getElementById("watchlist-items");
  if (!container) return;

  container.innerHTML = "";

  if (watchlist.length === 0) {
    container.innerHTML = `
      <div class="empty-watchlist">
        <p>Your watchlist is empty.</p>
        <span class="small-text">Click the bookmark icon on any movie to save it here.</span>
      </div>
    `;
    return;
  }

  watchlist.forEach(movie => {
    const item = document.createElement("div");
    item.className = "watchlist-item";
    item.innerHTML = `
      <img src="${movie.poster}" alt="${movie.title}" class="watchlist-thumb">
      <div class="watchlist-info" onclick="openMovieDetails(${movie.id})">
        <h4>${movie.title}</h4>
        <span>${movie.genres[0]} • ${movie.year}</span>
      </div>
      <button class="remove-watchlist-btn" onclick="toggleWatchlist(event, ${movie.id})">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    container.appendChild(item);
  });
}

// Open Movie Details Modal
window.openMovieDetails = function(movieId) {
  const movie = MOVIES_DATA.find(m => m.id === movieId);
  if (!movie) return;

  const modal = document.getElementById("movie-modal");
  if (!modal) return;

  // Content population
  document.getElementById("modal-poster").src = movie.poster;
  document.getElementById("modal-title").textContent = movie.title;
  document.getElementById("modal-meta").innerHTML = `
    <span>${movie.year}</span> • 
    <span>${movie.duration}</span> • 
    <span class="rating-badge">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; margin-right: 4px;">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>${movie.rating.toFixed(1)}
    </span>
  `;
  document.getElementById("modal-genres").innerHTML = movie.genres.map(g => `<span class="modal-genre-pill">${g}</span>`).join("");
  document.getElementById("modal-description").textContent = movie.description;
  document.getElementById("modal-director").textContent = movie.director;
  document.getElementById("modal-cast").textContent = movie.cast.join(", ");

  // Populate Keywords
  const keywordsContainer = document.getElementById("modal-keywords");
  if (keywordsContainer) {
    keywordsContainer.innerHTML = movie.keywords.map(k => `<span class="keyword-tag">#${k}</span>`).join("");
  }

  // Populate Similar Movies
  const similarContainer = document.getElementById("similar-movies-grid");
  if (similarContainer) {
    similarContainer.innerHTML = "";
    const similarMovies = getRecommendationsForMovie(movie, 3);
    
    similarMovies.forEach(simMovie => {
      const card = document.createElement("div");
      card.className = "similar-movie-card";
      card.innerHTML = `
        <img src="${simMovie.poster}" alt="${simMovie.title}">
        <div class="similar-info">
          <h5>${simMovie.title}</h5>
          <span>${simMovie.year} • ★ ${simMovie.rating.toFixed(1)}</span>
        </div>
      `;
      card.addEventListener("click", () => {
        openMovieDetails(simMovie.id);
      });
      similarContainer.appendChild(card);
    });
  }

  // Open Modal
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
};
