// Function to load quizzes for a specific activity room
async function loadQuizzesForRoom(activityRoomId) {
    try {
        console.log('Fetching quizzes for room ID:', activityRoomId); // Log room ID
        const response = await fetch(`/admin/activities/data/${activityRoomId}`);

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
                const maxAttempts = quiz.maxAttempts !== undefined ? quiz.maxAttempts : 'undefine'; // Display maxAttempts
                const quizHtml = `
                    <li class="list-group-item" id="quiz-item-${quiz._id}">
                        <a href="#" onclick="confirmStartQuiz('${quiz._id}', '${quiz.title}')">${quiz.title}</a>
                        ${isDraftLabel}
                        <p>Created on: ${createdAt}</p>
                        <p>Deadline: ${deadline}</p>
                         <p>Max Attempts: ${maxAttempts}</p>
                        <div class="kebab-menu" onclick="toggleQuizMenu('${quiz._id}')">&#x22EE;</div>
                        <div class="dropdown-menu quiz-menu" id="quiz-menu-${quiz._id}" style="display: none;">
                            <a href="#" onclick="archiveQuiz('${quiz._id}'); return false;">Archive</a>
                            <a href="/admin/quiz/modify/${quiz._id}">Modify</a>
                            <a href="#" onclick="toggleDraftStatus('${quiz._id}'); return false;">${quiz.isDraft ? 'Publish' : 'Make Private'}</a>
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

         // Update hidden input for the Import Quiz form
         const importQuizField = document.getElementById('importQuizActivityRoomId');
         if (importQuizField) {
             importQuizField.value = activityRoomId;
             console.log('Set activityRoomId for Import Quiz:', activityRoomId);
         }
    });
});


document.getElementById('importQuizForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    // Add the activityRoomId dynamically if not in the form
    const activityRoomId = document.getElementById('activityRoomId').value;
    formData.append('activityRoomId', activityRoomId);

    try {
        const response = await fetch('/admin/quiz/import', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const result = await response.json();
            alert('Quiz imported successfully!');
            window.location.reload();
        } else {
            const error = await response.json();
            alert('Error importing quiz: ' + error.message);
        }
    } catch (err) {
        console.error('Error importing quiz:', err);
        alert('An error occurred. Please try again.');
    }
});


// Function to publish a draft quiz
async function publishQuiz(quizId) {
    const confirmPublish = confirm('Are you sure you want to publish this quiz?');
    if (!confirmPublish) return;

    try {
        const response = await fetch(`/admin/quiz/publish/${quizId}`, { method: 'POST' });

        if (response.ok) {
            alert('Quiz successfully published.');
            document.getElementById(`quiz-item-${quizId}`).querySelector('.badge').remove(); // Remove draft label
            const menu = document.getElementById(`quiz-menu-${quizId}`);
            menu.querySelector('a[onclick^="publishQuiz"]').remove(); // Remove Publish option
        } else {
            const errorData = await response.json();
            alert(`Failed to publish quiz: ${errorData.message || 'Unknown error.'}`);
        }
    } catch (error) {
        console.error('Error publishing quiz:', error);
        alert('An error occurred while publishing the quiz.');
    }
}

function toggleDraftStatus(quizId) {
    const confirmToggle = confirm('Are you sure you want to toggle the visibility of this quiz?');
    if (confirmToggle) {
        fetch(`/admin/quiz/toggle-draft/${quizId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
    
            // Reload the quiz list dynamically
            const activityRoomId = document.getElementById('activityRoomId').value;
            loadQuizzesForRoom(activityRoomId);
        })
        .catch(error => console.error('Error toggling draft status:', error));
    
    }
}



// Function to toggle the kebab menu for quizzes
function toggleQuizMenu(quizId) {
    const menu = document.getElementById(`quiz-menu-${quizId}`);
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}




// Function to archive a quiz
function archiveQuiz(quizId) {
    const confirmArchive = confirm("Are you sure you want to archive this quiz? This action cannot be undone.");
    if (confirmArchive) {
        fetch(`/admin/archive-quiz/${quizId}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                const quizElement = document.getElementById(`quiz-item-${quizId}`);
                if (quizElement) {
                    quizElement.remove(); // Remove the quiz from the DOM
                }
            })
            .catch(error => console.error('Error archiving quiz:', error));
    } else {
        console.log("Archiving canceled.");
    }
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

const quizManager = (() => {
    let questionCount = 0;

    return {
        // Add a new question dynamically
        addQuestion: () => {
            // Dynamically count the number of questions in the DOM
            const questions = document.querySelectorAll('.question');
            const questionIndex = questions.length; // Use the current number of questions as the index
        
            const newQuestionHTML = `
                <div class="question" data-question-index="${questionIndex}">
                    <label>Question ${questionIndex + 1}:</label>
                    <input type="text" name="questions[${questionIndex}][questionText]" required><br>
        
                    <label>Question Type:</label>
                    <select name="questions[${questionIndex}][type]" class="questionType" required>
                        <option value="">Choose a Question Type</option>
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
                        <button type="button" class="addChoice btn" style="background-color: #FFDF9F; color: black;">Add Choice</button><br><br>
                    </div>
        
                    <div class="fill-in-the-blank" style="display: none;">
                        <label>Correct Answer:</label>
                        <input type="text" name="questions[${questionIndex}][correctAnswer]" required><br>
                    </div>
        
                    <button type="button" class="removeQuestion btn" style="background-color:rgb(212, 139, 97); color: black;">Remove Question</button><br><br>
                </div>`;
            
            document.getElementById('questions').insertAdjacentHTML('beforeend', newQuestionHTML);
        },
        

        // Remove a question and update indices
        removeQuestion: (questionElement) => {
            questionElement.remove();
            quizManager.updateIndices();
        },

        // Update question indices after removal
        updateIndices: () => {
            const questions = document.querySelectorAll('.question');
            questions.forEach((question, index) => {
                question.setAttribute('data-question-index', index);
                question.querySelector('label').textContent = `Question ${index + 1}:`;
        
                // Update input names dynamically
                const questionInput = question.querySelector('input[name*="[questionText]"]');
                if (questionInput) {
                    questionInput.setAttribute('name', `questions[${index}][questionText]`);
                }
        
                const choices = question.querySelectorAll('.choice');
                choices.forEach((choice, choiceIndex) => {
                    choice.setAttribute('data-choice-index', choiceIndex);
                    const textInput = choice.querySelector('input[name*="[text]"]');
                    const checkboxInput = choice.querySelector('input[name*="[isCorrect]"]');
                    textInput.setAttribute('name', `questions[${index}][choices][${choiceIndex}][text]`);
                    checkboxInput.setAttribute('name', `questions[${index}][choices][${choiceIndex}][isCorrect]`);
                });
        
                const fillBlankInput = question.querySelector('.fill-in-the-blank input[type="text"]');
                if (fillBlankInput) {
                    fillBlankInput.setAttribute('name', `questions[${index}][correctAnswer]`);
                }
            });
        },
        
    };
})();

// Attach event listener for Add Question button
document.getElementById('addQuestion').addEventListener('click', () => {
    quizManager.addQuestion();
});

// Event delegation for dynamically added choices and questions
document.getElementById('questions').addEventListener('click', (event) => {
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
        quizManager.removeQuestion(questionDiv);
    }
});

// Show or hide choice fields based on question type
document.getElementById('questions').addEventListener('change', (event) => {
    if (event.target && event.target.classList.contains('questionType')) {
        const questionDiv = event.target.closest('.question');
        const choicesDiv = questionDiv.querySelector('.choices');
        const fillBlankDiv = questionDiv.querySelector('.fill-in-the-blank');

        if (event.target.value === 'multiple-choice') {
            choicesDiv.style.display = 'block';
            fillBlankDiv.style.display = 'none';
        } else if (event.target.value === 'fill-in-the-blank') {
            choicesDiv.style.display = 'none';
            fillBlankDiv.style.display = 'block';
        }
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

// Function to archive an activity room with confirmation
function archiveActivityRoom(activityRoomId) {
    const confirmArchive = confirm("Are you sure you want to archive this activity room? This action cannot be undone.");
    if (confirmArchive) {
        fetch(`/admin/archive-activity-room/${activityRoomId}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                window.location.reload(); // Reload the page to reflect changes
            })
            .catch(error => console.error('Error archiving activity room:', error));
    } else {
        console.log("Archiving canceled.");
    }
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

document.getElementById('quizForm').addEventListener('submit', function(event) {
    const timer = document.getElementById('timer').value;
    
    // Check if the timer is not selected
    if (!timer) {
        event.preventDefault(); // Prevent form submission
        alert('Please select a timer before submitting the quiz.');
    }
});