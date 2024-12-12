const timerDisplayElement = document.getElementById('timer-display');
const timeUpMessageElement = document.getElementById('time-up-message');
const quizForm = document.getElementById('quizForm');
const timerDisplay = document.getElementById('timer');
const quizId = quizForm.action.split('/').pop(); // Extract the quiz ID from the form action URL

// Clear any old localStorage data for this quiz when the page loads
localStorage.removeItem(`quizStartTime_${quizId}`);
localStorage.removeItem(`quizRemainingTime_${quizId}`);
localStorage.removeItem(`quizProgress_${quizId}`);

// Initialize the start time and duration
const quizDuration = parseInt(timerDisplayElement.getAttribute('data-timer'), 10) * 60 * 1000; // in milliseconds
const startTime = Date.now(); // Set the current time as the start time
localStorage.setItem(`quizStartTime_${quizId}`, startTime); // Store the start time in localStorage

const endTime = startTime + quizDuration;

function updateTimer() {
    const now = Date.now();
    const remainingTime = endTime - now;

    if (remainingTime <= 0) {
        clearInterval(countdown);
        // Show the time-up notification message
        if (timeUpMessageElement) {
            timeUpMessageElement.style.display = 'block';
        }
        // Automatically submit the quiz without any user interaction
        setTimeout(() => {
            clearLocalStorage();
            quizForm.submit();
        }, 2000); // Give user 2 seconds to see the message
    } else {
        const minutes = Math.floor(remainingTime / 1000 / 60);
        const seconds = Math.floor((remainingTime / 1000) % 60);
        timerDisplay.innerText = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        // Save remaining time in localStorage for persistence
        localStorage.setItem(`quizRemainingTime_${quizId}`, remainingTime);
    }
}

// Interval to update the timer every second
const countdown = setInterval(updateTimer, 1000);
updateTimer(); // Initial call to display timer immediately

// Save answers periodically to localStorage
function saveProgress() {
    const answers = {};
    const formData = new FormData(quizForm);
    formData.forEach((value, key) => {
        answers[key] = value;
    });
    localStorage.setItem(`quizProgress_${quizId}`, JSON.stringify(answers));
}

// Load answers from localStorage when the page loads
function loadProgress() {
    const savedAnswers = JSON.parse(localStorage.getItem(`quizProgress_${quizId}`));
    if (savedAnswers) {
        Object.keys(savedAnswers).forEach(key => {
            const input = quizForm.elements[key];
            if (input) {
                if (input.type === 'radio') {
                    const radioButton = document.querySelector(`input[name="${key}"][value="${savedAnswers[key]}"]`);
                    if (radioButton) radioButton.checked = true;
                } else {
                    input.value = savedAnswers[key];
                }
            }
        });
    }
}

function confirmSubmission() {
    const confirmation = confirm("Are you sure you want to submit the quiz? Once submitted, you cannot change your answers.");
    if (confirmation) {
        clearLocalStorage(); // Clear localStorage only if the user confirms
    }
    return confirmation; // If true, the form will submit; otherwise, submission is canceled
}

// Clear localStorage when the quiz is submitted
function clearLocalStorage() {
    localStorage.removeItem(`quizStartTime_${quizId}`);
    localStorage.removeItem(`quizRemainingTime_${quizId}`);
    localStorage.removeItem(`quizProgress_${quizId}`);
}

// Event listeners to save progress
quizForm.addEventListener('input', saveProgress);
window.addEventListener('beforeunload', saveProgress);

// Load progress when the page is loaded
loadProgress();
