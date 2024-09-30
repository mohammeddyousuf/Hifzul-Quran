// Declare global variables
let currentAudio = null; // Keep track of the currently playing audio
let isPlaying = false;   // Track if "Play All" is active
let lastHighlightedAyah = null; // Track the last highlighted Ayah
let checksPerDay = 0;
let uncheckedCount = 0;
let totalAyahs = 0;
let tickedAyahs = 0; // Global variable to track total ticked Ayahs

// Fetch the Quran data and audio base URL
fetch('quran.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    const audioBaseUrl = "audio/";

    // Calculate total Ayahs in the Quran
    data.forEach(surah => {
      totalAyahs += surah.verses.length;
    });

    // Display total score, remaining Ayahs, and percentage completed in the top menu
    const topScoreSpan = document.createElement('span');
    topScoreSpan.classList.add('total-score');
    topScoreSpan.textContent = `Total Score: 0 / ${totalAyahs}, REM: ${totalAyahs}, P.C: 0.00%`;
    document.querySelector('.top-menu').appendChild(topScoreSpan);

    displayQuranData(data, totalAyahs, topScoreSpan, audioBaseUrl);
    populateChapterMenu(data); // Populate chapter menu for index button

    // Initialize unchecked count
    updateUncheckedCount();
  })
  .catch(error => {
    console.error('Error loading Quran data:', error);
    alert('Failed to load Quran data. Please try again later.');
  });

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
function displayQuranData(data, totalAyahs, topScoreSpan, audioBaseUrl) {
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

    // Add REM and PC information
    const remainingAyahs = surah.verses.length; // Initial remaining Ayahs for the surah
    const percentageCompleted = ((0 / surah.verses.length) * 100).toFixed(2); // Initial percentage completed

    const remPcSpan = document.createElement('span');
    remPcSpan.classList.add('rem-pc-info');
    remPcSpan.textContent = `REM: ${remainingAyahs}, P.C: ${percentageCompleted}%`;

    surahInfoH2.innerHTML = `Chapter ${surah.id}: ${surah.transliteration} - ${surah.type} - `;
    surahInfoH2.appendChild(scoreSpan);
    surahInfoH2.appendChild(document.createElement('br'));
    surahInfoH2.appendChild(remPcSpan); // Add REM and PC info here

    // Create the Play All button and add it to the chapter header
    const playAllButton = document.createElement('button');
    playAllButton.textContent = "Play All";
    playAllButton.classList.add('play-all-button');
    playAllButton.setAttribute('aria-label', 'Play all verses in this chapter');
    playAllButton.addEventListener('click', () => {
      if (!isPlaying) {
        isPlaying = true;

        // Determine if any repeat counters are set
        const countersSet = surahSection.querySelectorAll('.verse-container[data-repeat-count]:not([data-repeat-count="0"])').length > 0;
        if (countersSet) {
          playAllButton.textContent = "Stop Selected";
        } else {
          playAllButton.textContent = "Stop All";
        }

        playAllAyahsSequentially(surah, surahSection, audioBaseUrl, playAllButton);
      } else {
        isPlaying = false;
        // Determine if any repeat counters are set
        const countersSet = surahSection.querySelectorAll('.verse-container[data-repeat-count]:not([data-repeat-count="0"])').length > 0;
        if (countersSet) {
          playAllButton.textContent = "Play Selected";
        } else {
          playAllButton.textContent = "Play All";
        }
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        resetAllCounters(surahSection);
        enableIncrementDecrementButtons(true); // Re-enable increment/decrement buttons when stopped
        if (lastHighlightedAyah) {
          lastHighlightedAyah.classList.remove('highlight'); // Remove highlight if playback is stopped
        }
        updatePlayAllButtonText(); // Update button text
      }
    });

    // Update Play All button text based on counters
    const updatePlayAllButtonText = () => {
      const countersSet = surahSection.querySelectorAll('.verse-container[data-repeat-count]:not([data-repeat-count="0"])').length > 0;
      if (isPlaying) {
        playAllButton.textContent = countersSet ? "Stop Selected" : "Stop All";
      } else {
        playAllButton.textContent = countersSet ? "Play Selected" : "Play All";
      }
    };

    headerDiv.appendChild(surahNameH1);
    headerDiv.appendChild(surahInfoH2);
    headerDiv.appendChild(playAllButton);
    surahSection.appendChild(headerDiv);

    surah.verses.forEach(verse => {
      const verseContainer = document.createElement('div');
      verseContainer.classList.add('verse-container');
      verseContainer.dataset.repeatCount = 0; // Set default repeat count

      // Checkbox remains on the left
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.classList.add('verse-checkbox');
      checkbox.setAttribute('aria-label', `Mark verse ${verse.id} as completed`);
      checkbox.addEventListener('change', function () {
        // Now, update the chapter checkbox in the index menu

        // First, get the parent chapter section
        const chapterSection = checkbox.closest('section[data-chapter-id]');
        // Get all verse checkboxes in this chapter
        const allVerseCheckboxes = chapterSection.querySelectorAll('.verse-checkbox');
        // Check how many are checked
        const checkedCount = Array.from(allVerseCheckboxes).filter(cb => cb.checked).length;
        // Get the total number of verse checkboxes
        const totalVerseCheckboxes = allVerseCheckboxes.length;

        // Find the chapter checkbox in the index menu
        const chapterId = chapterSection.dataset.chapterId;
        const chapterCheckbox = document.querySelector(`.chapter-checkbox[data-chapter-id="${chapterId}"]`);
        if (chapterCheckbox) {
          if (checkedCount === totalVerseCheckboxes) {
            // All are checked
            chapterCheckbox.checked = true;
            chapterCheckbox.indeterminate = false;
          } else if (checkedCount === 0) {
            // None are checked
            chapterCheckbox.checked = false;
            chapterCheckbox.indeterminate = false;
          } else {
            // Some are checked
            chapterCheckbox.checked = false;
            chapterCheckbox.indeterminate = true;
          }
        }

        // Update counts
        updateCounts();

        // Update unchecked count and completion date
        updateUncheckedCount();
      });

      const counterContainer = document.createElement('div');
      counterContainer.classList.add('counter-container');

      const decrementBtn = document.createElement('button');
      decrementBtn.classList.add('counter-btn');
      decrementBtn.textContent = '-';
      decrementBtn.setAttribute('aria-label', `Decrease repeat count for verse ${verse.id}`);
      decrementBtn.addEventListener('click', () => {
        if (!isPlaying) {
          let repeatCount = parseInt(verseContainer.dataset.repeatCount || 0);
          if (repeatCount > 0) {
            repeatCount -= 1;
            verseContainer.dataset.repeatCount = repeatCount;
            counterDisplay.textContent = repeatCount;
            updatePlayAllButtonText(); // Update button text based on counters
          }
        }
      });

      const counterDisplay = document.createElement('span');
      counterDisplay.classList.add('counter-display');
      counterDisplay.textContent = 0; // Initialize counter

      const incrementBtn = document.createElement('button');
      incrementBtn.classList.add('counter-btn');
      incrementBtn.textContent = '+';
      incrementBtn.setAttribute('aria-label', `Increase repeat count for verse ${verse.id}`);
      incrementBtn.addEventListener('click', () => {
        if (!isPlaying) {
          let repeatCount = parseInt(verseContainer.dataset.repeatCount || 0);
          repeatCount += 1;
          verseContainer.dataset.repeatCount = repeatCount;
          counterDisplay.textContent = repeatCount;
          updatePlayAllButtonText(); // Update button text based on counters
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

// Function to populate the chapter popup menu with checkboxes
function populateChapterMenu(data) {
  const chapterList = document.getElementById('chapterList');

  data.forEach(surah => {
    const chapterItemDiv = document.createElement('div');
    chapterItemDiv.classList.add('chapter-item'); // Wrapper for each chapter item

    const chapterButton = document.createElement('button');
    chapterButton.textContent = `Chapter ${surah.id}: ${surah.transliteration}`;
    chapterButton.classList.add('chapter-button');
    chapterButton.setAttribute('aria-label', `Go to Chapter ${surah.id}`);

    // Scroll to the respective chapter when clicked with offset adjustment
    chapterButton.addEventListener('click', () => {
      const chapterSection = document.querySelector(`section[data-chapter-id="${surah.id}"]`);
      const yOffset = -70;  // Offset value to ensure the sticky header is not hidden
      const yPosition = chapterSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({ top: yPosition, behavior: 'smooth' });
      closePopup(); // Close the popup after selection
    });

    // Add a checkbox next to the chapter name
    const chapterCheckbox = document.createElement('input');
    chapterCheckbox.type = 'checkbox';
    chapterCheckbox.classList.add('chapter-checkbox');
    chapterCheckbox.setAttribute('data-chapter-id', surah.id); // Properly set data-chapter-id
    chapterCheckbox.setAttribute('aria-label', `Mark all verses in Chapter ${surah.id} as completed`);

    // Event listener to check/uncheck all verses in the chapter
    chapterCheckbox.addEventListener('change', function () {
      const chapterSection = document.querySelector(`section[data-chapter-id="${surah.id}"]`);
      const checkboxes = chapterSection.querySelectorAll('.verse-checkbox');

      // When user clicks on chapter checkbox, clear indeterminate state
      chapterCheckbox.indeterminate = false;

      // Update the checkboxes without dispatching 'change' events
      checkboxes.forEach(checkbox => {
        checkbox.checked = chapterCheckbox.checked;
      });

      // Update counts
      updateCounts();

      // Update unchecked count and completion date
      updateUncheckedCount();
    });

    // Append button and checkbox to the chapter item div
    chapterItemDiv.appendChild(chapterCheckbox);
    chapterItemDiv.appendChild(chapterButton);

    // Add the chapter item to the list
    chapterList.appendChild(chapterItemDiv);
  });
}

// Function to update counts
function updateCounts() {
  // Update global tickedAyahs
  tickedAyahs = document.querySelectorAll('.verse-checkbox:checked').length;

  // Update the top menu
  const topScoreSpan = document.querySelector('.top-menu .total-score');
  topScoreSpan.textContent = `Total Score: ${tickedAyahs} / ${totalAyahs}, REM: ${totalAyahs - tickedAyahs}, P.C: ${((tickedAyahs / totalAyahs) * 100).toFixed(2)}%`;

  // For each chapter, update tickedCount
  const chapters = document.querySelectorAll('.chapter');
  chapters.forEach(chapterSection => {
    const checkboxes = chapterSection.querySelectorAll('.verse-checkbox');
    const tickedCount = chapterSection.querySelectorAll('.verse-checkbox:checked').length;
    chapterSection.dataset.tickedCount = tickedCount;

    const scoreSpan = chapterSection.querySelector('.score');
    const remPcSpan = chapterSection.querySelector('.rem-pc-info');

    const remainingAyahs = checkboxes.length - tickedCount;
    const percentageCompleted = ((tickedCount / checkboxes.length) * 100).toFixed(2);

    scoreSpan.textContent = `Score: ${tickedCount} / ${checkboxes.length}`;
    remPcSpan.textContent = `REM: ${remainingAyahs}, P.C: ${percentageCompleted}%`;
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

  // Collect verses to play based on repeat counts
  const versesToPlay = Array.from(verseContainers).filter(vc => parseInt(vc.dataset.repeatCount) > 0);

  // If no repeat counts are set, play all verses once
  if (versesToPlay.length === 0) {
    versesToPlay.push(...verseContainers);
  }

  const playNextAyah = () => {
    if (currentAyahIndex >= versesToPlay.length || !isPlaying) {
      // Reset when all Ayahs have been played or playback is stopped
      isPlaying = false;
      enableIncrementDecrementButtons(true); // Re-enable increment/decrement buttons
      resetAllCounters(surahSection); // Reset all counters to 0 after playback

      // Update Play All button text based on counters
      const countersSet = surahSection.querySelectorAll('.verse-container[data-repeat-count]:not([data-repeat-count="0"])').length > 0;
      playAllButton.textContent = countersSet ? "Play Selected" : "Play All";
      return;
    }

    const verseContainer = versesToPlay[currentAyahIndex];
    const verseId = verseContainer.querySelector('.verse-card strong').textContent.replace(':', '');
    const surahId = String(surah.id).padStart(3, '0');
    const ayahId = String(verseId).padStart(3, '0');
    const audioUrl = `${audioBaseUrl}${surahId}${ayahId}.mp3`;

    let repeatCount = parseInt(verseContainer.dataset.repeatCount || 0);

    // If no repeat count is set, play once
    if (repeatCount === 0) {
      repeatCount = 1;
    }

    // Reset the counter to the correct repeat count before playing
    const counterDisplay = verseContainer.querySelector('.counter-display');
    counterDisplay.textContent = repeatCount;

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

  // Error handling for audio playback
  currentAudio.onerror = () => {
    console.error(`Error playing audio: ${audioUrl}`);
    alert('Failed to play audio. Please check your internet connection.');
    counterDisplay.textContent = 0;
    verseContainer.classList.remove('highlight');
    onFinished();
  };

  // When the audio ends, decrement the counter and handle looping
  currentAudio.onended = () => {
    repeatCount--;
    counterDisplay.textContent = repeatCount; // Update the counter

    if (repeatCount > 0 && isPlaying) {
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
  // Update Play All button text
  const updatePlayAllButtonText = surahSection.querySelector('.play-all-button').textContent;
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

// Update the uncheckedCount every time a checkbox changes
document.addEventListener('change', (event) => {
  if (event.target.classList.contains('verse-checkbox')) {
    updateUncheckedCount();
  }
});
