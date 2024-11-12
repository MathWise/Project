// Handle clicking on an activity room to set activityRoomId and fetch quizzes
document.querySelectorAll('.clickable').forEach(function(roomElement) {
    roomElement.addEventListener('click', function() {
        const activityRoomId = this.getAttribute('data-room-id');
        document.getElementById('activityRoomId').value = activityRoomId;  // Set hidden field value

        const roomContent = document.getElementById('quizActivityRoomContent');
        roomContent.style.display = 'block';

        // Fetch quizzes for the selected activity room
        loadQuizzesForRoom(activityRoomId);
    });
});


// Function to load non-archived quizzes for a specific activity room
async function loadQuizzesForRoom(activityRoomId) {
    try {
        const response = await fetch(`/admin/activities/data/${activityRoomId}`);
        const data = await response.json();
        console.log('Quizzes data:', data);

        const quizList = document.querySelector('#loadedQuizzes');
        quizList.innerHTML = '';

        if (data.quizzes && data.quizzes.length > 0) {
            data.quizzes.forEach(quiz => {
                const createdAt = new Date(quiz.createdAt).toLocaleString();
                const deadline = quiz.deadline ? new Date(quiz.deadline).toLocaleString() : 'No deadline';
                const quizHtml = `
                    <li class="list-group-item" id="quiz-item-${quiz._id}">
                        <a href="#" onclick="confirmStartQuiz('${quiz._id}', '${quiz.title}')">${quiz.title}</a>
                        <p>Created on: ${createdAt}</p>
                        <p>Deadline: ${deadline}</p>
                        <!-- Kebab Menu for each Quiz -->
                        <div class="kebab-menu" onclick="toggleQuizMenu('${quiz._id}')">&#x22EE;</div>
                        <div class="dropdown-menu quiz-menu" id="quiz-menu-${quiz._id}" style="display: none;">
                            <a href="#" onclick="archiveQuiz('${quiz._id}'); return false;">Archive</a>
                        </div>
                    </li>`;
                quizList.insertAdjacentHTML('beforeend', quizHtml);
            });
        } else {
            quizList.innerHTML = '<li class="list-group-item">No quizzes available.</li>';
        }
    } catch (error) {
        console.error('Error fetching quizzes:', error);
    }
}



// Function to toggle the kebab menu for quizzes
function toggleQuizMenu(quizId) {
    const menu = document.getElementById(`quiz-menu-${quizId}`);
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}




// Function to archive a quiz
function archiveQuiz(quizId) {
    fetch(`/admin/archive-quiz/${quizId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                // Remove the archived quiz from the DOM
                const quizElement = document.getElementById(`quiz-item-${quizId}`);
                if (quizElement) {
                    quizElement.remove();
                }
            } else {
                alert('Error archiving quiz.');
            }
        })
        .catch(error => console.error('Error archiving quiz:', error));
}




// Close quiz kebab menus when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.kebab-menu')) {
        document.querySelectorAll('.quiz-menu').forEach(menu => menu.style.display = 'none');
    }
});
// Confirmation function for starting the quiz
function confirmStartQuiz(quizId, quizTitle) {
    const userConfirmed = confirm(`Are you sure you want to start the quiz: "${quizTitle}"? You cannot cancel once you begin.`);
    
    if (userConfirmed) {
        // Redirect to the quiz start page
        window.location.href = `/admin/quizzes/start/${quizId}`;
    } else {
        console.log('User canceled the quiz start.');
    }
}

let questionCount = 1;

// Add new question dynamically
document.getElementById('addQuestion').addEventListener('click', function() {
    const questionIndex = questionCount;
    const newQuestionHTML = `
        <div class="question" data-question-index="${questionIndex}">
            <label>Question ${questionIndex + 1}:</label>
            <input type="text" name="questions[${questionIndex}][questionText]" required><br>

            <label>Question Type:</label>
            <select name="questions[${questionIndex}][type]" class="questionType" required>
                <option value="multiple-choice">Choose a Question Type</option>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="fill-in-the-blank">Fill in the Blank</option>
            </select><br>

            <div class="choices" style="display: none;">
                <label>Choices:</label>
                <div class="choice" data-choice-index="0">
                    <input type="text" name="questions[${questionIndex}][choices][0][text]" required>
                    <label>Correct?</label>
                    <input type="checkbox" name="questions[${questionIndex}][choices][0][isCorrect]"><br>
                </div>
                <button type="button" class="addChoice">Add Choice</button><br>
            </div>

            <div class="fill-in-the-blank" style="display: none;">
                <label>Correct Answer:</label>
                <input type="text" name="questions[${questionIndex}][correctAnswer]" required><br>
            </div>

            <button type="button" class="removeQuestion">Remove Question</button><br><br>
        </div>`;
    document.getElementById('questions').insertAdjacentHTML('beforeend', newQuestionHTML);
    questionCount++;
});

// Event listener for dynamically added choices and questions
document.addEventListener('click', function(event) {
    if (event.target && event.target.classList.contains('addChoice')) {
        const questionDiv = event.target.closest('.question');
        const questionIndex = questionDiv.getAttribute('data-question-index');
        const choicesDiv = questionDiv.querySelector('.choices');
        const choiceCount = choicesDiv.querySelectorAll('.choice').length;

        const newChoiceHTML = `
            <div class="choice" data-choice-index="${choiceCount}">
                <input type="text" name="questions[${questionIndex}][choices][${choiceCount}][text]" required>
                <label>Correct?</label>
                <input type="checkbox" name="questions[${questionIndex}][choices][${choiceCount}][isCorrect]"><br>
            </div>`;
        choicesDiv.insertAdjacentHTML('beforeend', newChoiceHTML);
    }

    if (event.target && event.target.classList.contains('removeQuestion')) {
        const questionDiv = event.target.closest('.question');
        questionDiv.remove();
        updateQuestionIndices();
    }
});

// Show or hide choice fields based on question type
document.addEventListener('change', function(event) {
    if (event.target && event.target.classList.contains('questionType')) {
        const questionDiv = event.target.closest('.question');
        const choicesDiv = questionDiv.querySelector('.choices');
        const fillBlankDiv = questionDiv.querySelector('.fill-in-the-blank');
        const correctAnswerInput = fillBlankDiv.querySelector('input[type="text"]');

        if (event.target.value === 'multiple-choice') {
            choicesDiv.style.display = 'block';
            fillBlankDiv.style.display = 'none';
            correctAnswerInput.removeAttribute('required');
        } else if (event.target.value === 'fill-in-the-blank') {
            choicesDiv.style.display = 'none';
            fillBlankDiv.style.display = 'block';
            correctAnswerInput.setAttribute('required', true);
        }
    }
});

// Validation and form submission handling
document.getElementById('quizForm').addEventListener('submit', function(event) {
    const timer = document.getElementById('timer').value;
    const deadlineInput = document.getElementById('deadline').value;
    const deadlineDate = new Date(deadlineInput);
    let isValid = true;

    if (deadlineInput && deadlineDate < new Date()) {
        alert("Please select a future deadline date.");
        isValid = false;
    }

    const questions = document.querySelectorAll('.question');
    questions.forEach(question => {
        const questionType = question.querySelector('.questionType').value;
        if (questionType === 'multiple-choice') {
            const correctChoices = question.querySelectorAll('.choices input[type="checkbox"]:checked');
            if (correctChoices.length === 0) {
                alert("Please select at least one correct answer for each multiple-choice question.");
                isValid = false;
            }
        }
    });

    if (!isValid) {
        event.preventDefault();
    } else {
        console.log('Submitting quiz with timer:', timer);
        console.log('Submitting quiz with deadline:', deadlineInput);
    }
});

// Update question indices to maintain order
function updateQuestionIndices() {
    const questions = document.querySelectorAll('.question');
    questions.forEach((question, index) => {
        question.setAttribute('data-question-index', index);
        question.querySelector('label').textContent = `Question ${index + 1}:`;

        const questionInput = question.querySelector('input[type="text"]');
        questionInput.setAttribute('name', `questions[${index}][questionText]`);

        const choices = question.querySelectorAll('.choice');
        choices.forEach((choice, choiceIndex) => {
            choice.setAttribute('data-choice-index', choiceIndex);
            const textInput = choice.querySelector('input[type="text"]');
            const checkboxInput = choice.querySelector('input[type="checkbox"]');
            textInput.setAttribute('name', `questions[${index}][choices][${choiceIndex}][text]`);
            checkboxInput.setAttribute('name', `questions[${index}][choices][${choiceIndex}][isCorrect]`);
        });

        const fillBlankInput = question.querySelector('.fill-in-the-blank input[type="text"]');
        if (fillBlankInput) {
            fillBlankInput.setAttribute('name', `questions[${index}][correctAnswer]`);
        }
    });
}
// Toggle the main dropdown menu
function toggleDropdownMenu() {
    const menu = document.getElementById("dropdownMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Close the dropdown when clicking outside of it
document.addEventListener("click", function(event) {
    const menu = document.getElementById("dropdownMenu");
    const trigger = document.querySelector(".settings-icon");

    // Only close if clicking outside of both the menu and the trigger element
    if (!menu.contains(event.target) && event.target !== trigger) {
        menu.style.display = "none";
    }
});

// Function to archive an activity room
function archiveActivityRoom(activityRoomId) {
    fetch(`/admin/archive-activity-room/${activityRoomId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            window.location.reload();
        })
        .catch(error => console.error('Error archiving activity room:', error));
}

// Toggle the individual kebab menu for each room
function toggleMenu(roomId) {
    const menu = document.getElementById(`menu-${roomId}`);
    // Toggle visibility while keeping other menus hidden
    const isVisible = menu.style.display === 'block';
    closeAllMenus(); // Close any open menus first
    menu.style.display = isVisible ? 'none' : 'block';
}

// Close all kebab dropdown menus
function closeAllMenus() {
    const dropdowns = document.querySelectorAll('.dropdown-menu');
    dropdowns.forEach(menu => {
        menu.style.display = 'none';
    });
}

// Close dropdown menus when clicking outside any dropdown
document.addEventListener('click', function(event) {
    if (!event.target.classList.contains('kebab-menu') && !event.target.classList.contains('dropdown-menu')) {
        closeAllMenus(); // Close all menus if clicking outside them
    }
});