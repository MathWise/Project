// Function to load quizzes for a specific activity room
async function loadQuizzesForRoom(activityRoomId) {
    try {
        console.log('Fetching quizzes for room ID:', activityRoomId); // Log room ID
        const response = await fetch(`/user/activities/data/${activityRoomId}`);

        if (!response.ok) {
            console.error('Failed to fetch quizzes:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        console.log('Quizzes data:', data); // Log fetched data

        const quizList = document.querySelector('#loadedQuizzes');
        quizList.innerHTML = ''; // Clear the list

        if (data.quizzes && data.quizzes.length > 0) {
            data.quizzes.forEach(quiz => {
                const createdAt = new Date(quiz.createdAt).toLocaleString();
                const deadline = quiz.deadline ? new Date(quiz.deadline).toLocaleString() : 'No deadline';
                const isDraftLabel = quiz.isDraft ? '<span class="badge badge-warning">Draft</span>' : '';
                const publishOption = quiz.isDraft
                                ? `<a href="#" onclick="publishQuiz('${quiz._id}'); return false;">Publish</a>`
                : '';
                const quizHtml = `
                    <li class="list-group-item" id="quiz-item-${quiz._id}">
                      ${isDraftLabel}
                        <a href="#" onclick="confirmStartQuiz('${quiz._id}', '${quiz.title}')">${quiz.title}</a>
                        <p>Created on: ${createdAt}</p>
                        <p>Deadline: ${deadline}</p>

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

// Event listener for selecting a quiz or activity room
document.querySelectorAll('.clickable').forEach(function (roomElement) {
    roomElement.addEventListener('click', function () {
        const activityRoomId = this.getAttribute('data-room-id'); // Extract room ID
        const activityType = this.querySelector('strong').textContent.trim(); // Extract type (Activity/Quiz)

        console.log('Room clicked, ID:', activityRoomId, 'Type:', activityType);

        if (!activityRoomId) {
            console.error('No activityRoomId found for the clicked room.');
            return;
        }

        if (activityType === 'Quiz') {
            // Show quiz-related content and update the hidden field for quizzes
            document.getElementById('activityRoomContent').style.display = 'none';
            document.getElementById('quizActivityRoomContent').style.display = 'block';

            const quizActivityRoomIdField = document.getElementById('activityRoomId');
            if (quizActivityRoomIdField) {
                quizActivityRoomIdField.value = activityRoomId;
                console.log('Set quizActivityRoomId:', activityRoomId);
            }
            loadQuizzesForRoom(activityRoomId);
        } else if (activityType === 'Activity') {
            // Show activity-related content and update the hidden field for activities
            document.getElementById('quizActivityRoomContent').style.display = 'none';
            document.getElementById('activityRoomContent').style.display = 'block';

            const activityRoomIdInput = document.getElementById('aactivityRoomId'); // Updated to match new field
            if (activityRoomIdInput) {
                activityRoomIdInput.value = activityRoomId; // Set the hidden field value
                console.log('Set aactivityRoomId for Activity:', activityRoomIdInput.value);
            } else {
                console.error('Hidden input aactivityRoomId not found in DOM.');
            }

            loadActivitiesForRoom(activityRoomId);
        }
    });
});





// Function to toggle the kebab menu for quizzes
function toggleQuizMenu(quizId) {
    const menu = document.getElementById(`quiz-menu-${quizId}`);
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
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
        window.location.href = `/user/quizzes/userStart/${quizId}`;
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

          // Restrict to a maximum of 4 choices
          if (choiceCount >= 4) {
            alert("You can only add up to 4 choices per question.");
            return;
        }

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
            // Show choices and make choice fields required
            choicesDiv.style.display = 'block';
            fillBlankDiv.style.display = 'none';
            correctAnswerInput.removeAttribute('required');
            
            // Make choice inputs required
            const choiceInputs = choicesDiv.querySelectorAll('input[type="text"]');
            choiceInputs.forEach(input => input.setAttribute('required', true));
        } else if (event.target.value === 'fill-in-the-blank') {
            // Show correct answer input and make it required
            choicesDiv.style.display = 'none';
            fillBlankDiv.style.display = 'block';
            correctAnswerInput.setAttribute('required', true);
            
            // Remove required attribute from choice inputs
            const choiceInputs = choicesDiv.querySelectorAll('input[type="text"]');
            choiceInputs.forEach(input => input.removeAttribute('required'));
        }
    }
});


document.getElementById('quizForm').addEventListener('submit', function(event) {
    const questions = document.querySelectorAll('.question');
    const questionsData = [];
    let isValid = true;

    questions.forEach((question, index) => {
        const questionType = question.querySelector('.questionType').value;

        // Validate question type
        if (!questionType) {
            alert(`Question ${index + 1} must have a valid type.`);
            isValid = false;
            return;
        }

        // Validate question text
        const questionText = question.querySelector('input[type="text"]').value.trim();
        if (!questionText) {
            alert(`Question ${index + 1} must have text.`);
            isValid = false;
            return;
        }

        if (questionType === 'multiple-choice') {
            const choices = [];
            const choiceElements = question.querySelectorAll('.choices .choice');
            
            choiceElements.forEach(choiceEl => {
                const text = choiceEl.querySelector('input[type="text"]').value.trim();
                const isCorrect = choiceEl.querySelector('input[type="checkbox"]').checked;
                if (text) {
                    choices.push({ text, isCorrect });
                }
            });

            // Validate multiple-choice choices
            if (choices.length === 0) {
                alert(`Question ${index + 1}: Multiple-choice question must have at least one choice.`);
                isValid = false;
            } else if (!choices.some(choice => choice.isCorrect)) {
                alert(`Question ${index + 1}: Multiple-choice question must have at least one correct answer.`);
                isValid = false;
            }

            questionsData.push({ type: questionType, choices });
        } else if (questionType === 'fill-in-the-blank') {
            const correctAnswer = question.querySelector('.fill-in-the-blank input[type="text"]').value.trim();

            // Validate fill-in-the-blank correct answer
            if (!correctAnswer) {
                alert(`Question ${index + 1}: Fill-in-the-blank question must have a correct answer.`);
                isValid = false;
            }

            questionsData.push({ type: questionType, correctAnswer });
        }
    });

    console.log('Submitting questions data:', JSON.stringify(questionsData, null, 2));

    // If validation fails, block submission
    if (!isValid) {
        event.preventDefault();
    }
});


function validateQuestions(questions) {
    let isValid = true;

    questions.forEach((question, index) => {
        if (question.type === 'multiple-choice') {
            if (!question.choices.some(choice => choice.isCorrect)) {
                alert(`Question ${index + 1}: Multiple-choice question must have at least one correct answer.`);
                isValid = false;
            }
        } else if (question.type === 'fill-in-the-blank') {
            if (!question.correctAnswer) {
                alert(`Question ${index + 1}: Fill-in-the-blank question must have a correct answer.`);
                isValid = false;
            }
        }
    });

    return isValid;
}


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

document.getElementById('quizForm').addEventListener('submit', function(event) {
    const timer = document.getElementById('timer').value;
    
    // Check if the timer is not selected
    if (!timer) {
        event.preventDefault(); // Prevent form submission
        alert('Please select a timer before submitting the quiz.');
    }
});