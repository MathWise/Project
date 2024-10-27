document.addEventListener('DOMContentLoaded', function() {
  let questionCount = 1; // Track how many questions have been added

  document.getElementById('addQuestion').addEventListener('click', function() {
      const questionIndex = questionCount;
      const newQuestionHTML = `
          <div class="question" data-question-index="${questionIndex}">
              <label>Question ${questionIndex + 1}:</label>
              <input type="text" name="questions[${questionIndex}][questionText]" required><br>

              <!-- Dropdown to select question type -->
              <label>Question Type:</label>
              <select name="questions[${questionIndex}][type]" class="questionType" required>
                
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="fill-in-the-blank">Fill in the Blank</option>
              </select><br>

              <!-- For multiple-choice, choices will be added here -->
              <div class="choices" style="display: none;">
                  <label>Choices:</label>
                  <div class="choice" data-choice-index="0">
                      <input type="text" name="questions[${questionIndex}][choices][0][text]" required>
                      <label>Correct?</label>
                      <input type="checkbox" name="questions[${questionIndex}][choices][0][isCorrect]"><br>
                  </div>
                  <button type="button" class="addChoice">Add Choice</button><br>
              </div>

              <!-- For fill-in-the-blank, correct answer input -->
              <div class="fill-in-the-blank" style="display: none;">
                  <label>Correct Answer:</label>
                  <input type="text" name="questions[${questionIndex}][correctAnswer]" required><br>
              </div>

              <button type="button" class="removeQuestion">Remove Question</button><br><br>
          </div>
      `;
      document.getElementById('questions').insertAdjacentHTML('beforeend', newQuestionHTML);
      questionCount++;
  });

  // Event delegation for dynamically added elements
  document.addEventListener('click', function(event) {
      // Handle adding a choice for multiple-choice questions
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
              </div>
          `;
          choicesDiv.insertAdjacentHTML('beforeend', newChoiceHTML);
      }

      // Handle removing a question
      if (event.target && event.target.classList.contains('removeQuestion')) {
          const questionDiv = event.target.closest('.question');
          questionDiv.remove();
          updateQuestionIndices(); // Update indices after removing a question
      }
  });

  // Toggle between multiple-choice and fill-in-the-blank based on question type selection
  document.addEventListener('change', function(event) {
      if (event.target && event.target.classList.contains('questionType')) {
          const questionDiv = event.target.closest('.question');
          const choicesDiv = questionDiv.querySelector('.choices');
          const fillBlankDiv = questionDiv.querySelector('.fill-in-the-blank');
          const choiceInputs = choicesDiv.querySelectorAll('input[type="text"]');
          const correctAnswerInput = fillBlankDiv.querySelector('input[type="text"]');

          if (event.target.value === 'multiple-choice') {
              // Show choices, hide fill-in-the-blank, and set appropriate required fields
              choicesDiv.style.display = 'block';
              fillBlankDiv.style.display = 'none';
              correctAnswerInput.removeAttribute('required');
              choiceInputs.forEach(input => input.setAttribute('required', true));
          } else if (event.target.value === 'fill-in-the-blank') {
              // Show fill-in-the-blank, hide choices, and set appropriate required fields
              choicesDiv.style.display = 'none';
              fillBlankDiv.style.display = 'block';
              correctAnswerInput.setAttribute('required', true);
              choiceInputs.forEach(input => input.removeAttribute('required'));
          }
      }
  });

  function updateQuestionIndices() {
      const questions = document.querySelectorAll('.question');
      questions.forEach((question, index) => {
          question.setAttribute('data-question-index', index);
          question.querySelector('label').textContent = `Question ${index + 1}:`;

          // Update question input names
          const questionInput = question.querySelector('input[type="text"]');
          questionInput.setAttribute('name', `questions[${index}][questionText]`);

          // Update choice input names (for multiple-choice questions)
          const choices = question.querySelectorAll('.choice');
          choices.forEach((choice, choiceIndex) => {
              choice.setAttribute('data-choice-index', choiceIndex);
              const textInput = choice.querySelector('input[type="text"]');
              const checkboxInput = choice.querySelector('input[type="checkbox"]');
              textInput.setAttribute('name', `questions[${index}][choices][${choiceIndex}][text]`);
              checkboxInput.setAttribute('name', `questions[${index}][choices][${choiceIndex}][isCorrect]`);
          });

          // Update the fill-in-the-blank input name
          const fillBlankInput = question.querySelector('.fill-in-the-blank input[type="text"]');
          if (fillBlankInput) {
              fillBlankInput.setAttribute('name', `questions[${index}][correctAnswer]`);
          }
      });
  }
});
