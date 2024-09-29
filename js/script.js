// Declare global variables
let currentAudio = null; // Keep track of the currently playing audio
let isPlaying = false;   // Track if "Play All" is active
let lastHighlightedAyah = null; // Track the last highlighted Ayah
let checksPerDay = 0;
let uncheckedCount = 0;
let totalAyahs = 0;

// Fetch the Quran data and audio base URL
fetch('quran.json')
  .then(response => response.json())
  .then(data => {
    let totalAyahs = 0;
    let tickedAyahs = 0;

    const audioBaseUrl = "https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/";

    // Calculate total Ayahs in the Quran
    data.forEach(surah => {
      totalAyahs += surah.verses.length;
    });

    // Display total score in the top menu
    const topScoreSpan = document.createElement('span');
    topScoreSpan.classList.add('total-score');
    topScoreSpan.textContent = `Total Score: 0 / ${totalAyahs}`;
    document.querySelector('.top-menu').appendChild(topScoreSpan);

    displayQuranData(data, totalAyahs, topScoreSpan, tickedAyahs, audioBaseUrl);
    populateChapterMenu(data); // Populate chapter menu for index button

    // Initialize unchecked count
    updateUncheckedCount();
  })
  .catch(error => console.error('Error loading Quran data:', error));

// Function to toggle Dark/Light mode
function toggleMode() {
  const body = document.body;
  const modeToggleBtn = document.getElementById('modeToggle');

  if (body.classList.contains('dark-mode')) {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    modeToggleBtn.textContent = 'Dark';
  } else {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    modeToggleBtn.textContent = 'Light';
  }
}

document.getElementById('modeToggle').addEventListener('click', toggleMode);
document.body.classList.add('light-mode');

// Function to display Quran data
function displayQuranData(data, totalAyahs, topScoreSpan, tickedAyahs, audioBaseUrl) {
  const contentDiv = document.getElementById('content');

  data.forEach(surah => {
    const surahSection = document.createElement('section');
    surahSection.classList.add('chapter');
    surahSection.setAttribute('data-chapter-id', surah.id); // Add data attribute for scrolling

    const headerDiv = document.createElement('div');
    headerDiv.classList.add('sticky-header');

    const surahNameH1 = document.createElement('h1');
    surahNameH1.classList.add('surah-name-arabic');
    surahNameH1.textContent = surah.name;

    const surahInfoH2 = document.createElement('h2');
    surahInfoH2.classList.add('surah-info');
    const scoreSpan = document.createElement('span');
    scoreSpan.classList.add('score');
    scoreSpan.textContent = `Score: 0 / ${surah.verses.length}`;

    surahInfoH2.innerHTML = `Chapter ${surah.id}: ${surah.transliteration} - ${surah.type} - `;
    surahInfoH2.appendChild(scoreSpan);

    // Create the Play All button and add it to the chapter header
    const playAllButton = document.createElement('button');
    playAllButton.textContent = "Play All";
    playAllButton.classList.add('play-all-button');
    playAllButton.addEventListener('click', () => {
      if (!isPlaying) {
        isPlaying = true;
        playAllButton.textContent = "Stop All";
        playAllAyahsSequentially(surah, surahSection, audioBaseUrl, playAllButton);
      } else {
        isPlaying = false;
        playAllButton.textContent = "Play All";
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        resetAllCounters(surahSection);
        enableIncrementDecrementButtons(true); // Re-enable increment/decrement buttons when stopped
        if (lastHighlightedAyah) {
          lastHighlightedAyah.classList.remove('highlight'); // Remove highlight if playback is stopped
        }
      }
    });

    headerDiv.appendChild(surahNameH1);
    headerDiv.appendChild(surahInfoH2);
    headerDiv.appendChild(playAllButton);
    surahSection.appendChild(headerDiv);

    let tickedCount = 0;

    surah.verses.forEach(verse => {
      const verseContainer = document.createElement('div');
      verseContainer.classList.add('verse-container');
      verseContainer.dataset.repeatCount = 0; // Set default repeat count

      // Checkbox remains on the left
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.classList.add('verse-checkbox');
      checkbox.addEventListener('change', function () {
        if (checkbox.checked) {
          tickedCount += 1;
          tickedAyahs += 1;
        } else {
          tickedCount -= 1;
          tickedAyahs -= 1;
        }
        scoreSpan.textContent = `Score: ${tickedCount} / ${surah.verses.length}`;
        topScoreSpan.textContent = `Total Score: ${tickedAyahs} / ${totalAyahs}`;
        updateUncheckedCount(); // Update the unchecked count and recalculate completion date
      });

      const counterContainer = document.createElement('div');
      counterContainer.classList.add('counter-container');

      const decrementBtn = document.createElement('button');
      decrementBtn.classList.add('counter-btn');
      decrementBtn.textContent = '-';
      decrementBtn.addEventListener('click', () => {
        if (!isPlaying) {
          let repeatCount = parseInt(verseContainer.dataset.repeatCount || 0);
          if (repeatCount > 0) {
            repeatCount -= 1;
            verseContainer.dataset.repeatCount = repeatCount;
            counterDisplay.textContent = repeatCount;
          }
        }
      });

      const counterDisplay = document.createElement('span');
      counterDisplay.classList.add('counter-display');
      counterDisplay.textContent = 0; // Initialize counter

      const incrementBtn = document.createElement('button');
      incrementBtn.classList.add('counter-btn');
      incrementBtn.textContent = '+';
      incrementBtn.addEventListener('click', () => {
        if (!isPlaying) {
          let repeatCount = parseInt(verseContainer.dataset.repeatCount || 0);
          repeatCount += 1;
          verseContainer.dataset.repeatCount = repeatCount;
          counterDisplay.textContent = repeatCount;
        }
      });

      counterContainer.appendChild(decrementBtn);
      counterContainer.appendChild(counterDisplay);
      counterContainer.appendChild(incrementBtn);

      const verseCard = document.createElement('div');
      verseCard.classList.add('verse-card');
      verseCard.innerHTML = `<strong>${verse.id}:</strong> ${verse.text}`;

      verseContainer.appendChild(checkbox);
      verseContainer.appendChild(counterContainer);
      verseContainer.appendChild(verseCard);

      surahSection.appendChild(verseContainer);
    });

    contentDiv.appendChild(surahSection);
  });
}

// Function to populate the chapter popup menu
function populateChapterMenu(data) {
  const chapterList = document.getElementById('chapterList');

  data.forEach(surah => {
    const chapterButton = document.createElement('button');
    chapterButton.textContent = `Chapter ${surah.id}: ${surah.transliteration}`;
    
    // Scroll to the respective chapter when clicked with offset adjustment
    chapterButton.addEventListener('click', () => {
      const chapterSection = document.querySelector(`section[data-chapter-id="${surah.id}"]`);
      const yOffset = -70;  // Offset value to ensure the sticky header is not visible
      const yPosition = chapterSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({ top: yPosition, behavior: 'smooth' });
      closePopup(); // Close the popup after selection
    });

    chapterList.appendChild(chapterButton);
  });
}

// Function to show the chapter popup
function showPopup() {
  const chapterPopup = document.getElementById('chapterPopup');
  chapterPopup.style.display = 'block';
}

// Function to close the chapter popup
function closePopup() {
  const chapterPopup = document.getElementById('chapterPopup');
  chapterPopup.style.display = 'none';
}

// Event listeners for the Index button and close button
document.getElementById('indexButton').addEventListener('click', showPopup);
document.getElementById('closePopup').addEventListener('click', closePopup);

// Function to play all Ayahs sequentially and manage Play/Stop All toggle
function playAllAyahsSequentially(surah, surahSection, audioBaseUrl, playAllButton) {
  let currentAyahIndex = 0;

  const verseContainers = surahSection.querySelectorAll('.verse-container');

  const playNextAyah = () => {
    if (currentAyahIndex >= surah.verses.length || !isPlaying) {
      // Reset when all Ayahs have been played or playback is stopped
      playAllButton.textContent = "Play All";
      resetAllCounters(surahSection); // Reset all counters to 0 after playback
      isPlaying = false;
      enableIncrementDecrementButtons(true); // Re-enable increment/decrement buttons
      return;
    }

    const verse = surah.verses[currentAyahIndex];
    const surahId = String(surah.id).padStart(3, '0');
    const ayahId = String(verse.id).padStart(3, '0');
    const audioUrl = `${audioBaseUrl}${surahId}${ayahId}.mp3`;

    const verseContainer = verseContainers[currentAyahIndex];
    let repeatCount = parseInt(verseContainer.dataset.repeatCount || 0);

    // Reset the counter to the correct repeat count before playing
    const counterDisplay = verseContainer.querySelector('.counter-display');
    counterDisplay.textContent = repeatCount;

    if (repeatCount > 0) {
      playAyahWithCounter(
        audioUrl, 
        repeatCount, 
        counterDisplay, 
        verseContainer, // Pass verseContainer to highlight the Ayah
        () => {
          currentAyahIndex++; // Move to the next Ayah after the current one finishes
          playNextAyah();
        }
      );
    } else {
      currentAyahIndex++; // Skip if repeatCount is 0
      playNextAyah();
    }
  };

  // Disable increment and decrement buttons while Play All is active
  enableIncrementDecrementButtons(false);

  // Start playing the first Ayah
  playNextAyah();
}

// Function to play individual Ayahs with repeat counts and highlight them
function playAyahWithCounter(audioUrl, repeatCount, counterDisplay, verseContainer, onFinished) {
  currentAudio = new Audio(audioUrl); // Track the current audio

  // Highlight the current Ayah
  if (lastHighlightedAyah) {
    lastHighlightedAyah.classList.remove('highlight'); // Remove highlight from the last Ayah
  }
  verseContainer.classList.add('highlight');
  lastHighlightedAyah = verseContainer; // Track this as the last highlighted Ayah

  // Display the correct repeat count at the start
  counterDisplay.textContent = repeatCount;
  currentAudio.play();

  // When the audio ends, decrement the counter and handle looping
  currentAudio.onended = () => {
    repeatCount--;
    counterDisplay.textContent = repeatCount; // Update the counter

    if (repeatCount > 0) {
      playAyahWithCounter(audioUrl, repeatCount, counterDisplay, verseContainer, onFinished); // Replay if needed
    } else {
      counterDisplay.textContent = 0; // Reset the counter to 0
      verseContainer.classList.remove('highlight'); // Remove the highlight after the Ayah finishes
      onFinished(); // Call the callback to continue with the next Ayah
    }
  };
}

// Function to reset all counters and ensure no old values remain
function resetAllCounters(surahSection) {
  const counters = surahSection.querySelectorAll('.counter-display');
  counters.forEach(counter => {
    counter.textContent = 0; // Reset counter display to 0
    counter.closest('.verse-container').dataset.repeatCount = 0; // Reset the internal repeatCount
  });
}

// Function to enable/disable increment and decrement buttons
function enableIncrementDecrementButtons(enabled) {
  const buttons = document.querySelectorAll('.counter-btn');
  buttons.forEach(button => {
    button.disabled = !enabled;
  });
}

// Select the counter display elements for sticky bottom menu
const checkCountDisplay = document.getElementById('checkCountDisplay');
const completionDateDisplay = document.getElementById('completionDate');

// Increment and decrement buttons for bottom menu
document.getElementById('incrementCheckCount').addEventListener('click', () => {
  checksPerDay++;
  checkCountDisplay.textContent = checksPerDay;
  calculateCompletionDate();
});

document.getElementById('decrementCheckCount').addEventListener('click', () => {
  if (checksPerDay > 0) {
    checksPerDay--;
    checkCountDisplay.textContent = checksPerDay;
    calculateCompletionDate();
  }
});

// Function to calculate the estimated completion date
function calculateCompletionDate() {
  if (checksPerDay > 0 && uncheckedCount > 0) {
    const daysToComplete = Math.ceil(uncheckedCount / checksPerDay);
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + daysToComplete);

    // Format the date to DD/MM/YYYY
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = currentDate.getFullYear();

    const formattedDate = `${day}/${month}/${year}`;
    completionDateDisplay.textContent = formattedDate;
  } else {
    completionDateDisplay.textContent = 'N/A';
  }
}

// Modify existing code to update uncheckedCount whenever a checkbox is toggled
function updateUncheckedCount() {
  uncheckedCount = document.querySelectorAll('.verse-checkbox:not(:checked)').length;
  calculateCompletionDate();
}

// Call this function after fetching data to initialize uncheckedCount
fetch('quran.json')
  .then(response => response.json())
  .then(data => {
    // Calculate total and unchecked Ayahs
    totalAyahs = data.reduce((acc, surah) => acc + surah.verses.length, 0);
    updateUncheckedCount();
    // Existing logic for populating Quran data and UI elements...
  });

// Update the uncheckedCount every time a checkbox changes
document.addEventListener('change', (event) => {
  if (event.target.classList.contains('verse-checkbox')) {
    updateUncheckedCount();
  }
});
