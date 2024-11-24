

// Global variables to store the context for the modal
let modalAction = null;
let roomIdForModal = null;
let correctPasswordForModal = null;

// Function to open the modal for archiving a room
function archiveRoom(roomId) {
modalAction = 'archive';
roomIdForModal = roomId;

// Update the modal message
document.getElementById('passwordModal1').style.display = 'flex';

// Focus on the password input
document.getElementById('roomPassword1').focus();
}

// Function to open the modal for entering a room
function promptPassword(correctPassword, roomId) {


modalAction = 'enter';
roomIdForModal = roomId;
correctPasswordForModal = correctPassword;

// Update the modal message
document.getElementById('passwordModal1').style.display = 'flex';

// Focus on the password input
document.getElementById('roomPassword1').focus();
}

// Function to submit the password from the modal
function submitPassword1() {
const userPassword = document.getElementById('roomPassword1').value;

document.getElementById('loadingOverlay').style.display = 'flex';


if (modalAction === 'archive') {
   // Handle archive functionality
   if (userPassword) {
       // Create a form to submit the room ID and password to the server
       const form = document.createElement('form');
       form.method = 'POST';
       form.action = `/admin/archive-room/${roomIdForModal}`;

       // Add the password as a hidden input
       const passwordInput = document.createElement('input');
       passwordInput.type = 'hidden';
       passwordInput.name = 'roomPassword';
       passwordInput.value = userPassword;
       form.appendChild(passwordInput);

       document.body.appendChild(form);
       form.submit();
   } else {
       alert('Password is required to archive the room.');
   }
} else if (modalAction === 'enter') {
   // Handle entering a room
   if (userPassword === correctPasswordForModal) {
       // Redirect to the room's dashboard
       window.location.href = `/admin/dashboard/${roomIdForModal}`;
   } else {
       alert('Incorrect password. Please try again.');
   }
}

// Close the modal
closeModal1();
}

// Function to close the modal
function closeModal1() {
document.getElementById('passwordModal1').style.display = 'none';
document.getElementById('roomPassword1').value = ''; // Clear the input field

// Reset modal variables
modalAction = null;
roomIdForModal = null;
correctPasswordForModal = null;
}

// Handle Enter key submission
function checkEnterKey1(event) {
if (event.key === 'Enter') {
   submitPassword1();
}
}

   // Function to toggle the kebab menu dropdown display
   function toggleMenu(roomId) {
       const menu = document.getElementById(`menu-${roomId}`);
       menu.style.display = menu.style.display === 'none' || menu.style.display === '' ? 'block' : 'none';
   }
   


   // Close dropdown menus when clicking outside
   document.addEventListener('click', function(event) {
       const dropdowns = document.querySelectorAll('.dropdown-menu');
       dropdowns.forEach(menu => {
           menu.style.display = 'none';
       });
   });
   setTimeout(() => {
const successAlert = document.getElementById("success-alert");
const errorAlert = document.getElementById("error-alert");

if (successAlert) {
   successAlert.style.transition = "opacity 0.5s ease";
   successAlert.style.opacity = "0";
   setTimeout(() => successAlert.remove(), 500);
}

if (errorAlert) {
   errorAlert.style.transition = "opacity 0.5s ease";
   errorAlert.style.opacity = "0";
   setTimeout(() => errorAlert.remove(), 500);
}
}, 3000);

   console.log("Success Message:", "<%= successMessage %>");
   console.log("Error Message:", "<%= errorMessage %>");


window.addEventListener("load", () => {
   if (!sessionStorage.getItem("loggedIn")) {
       sessionStorage.clear();
       window.location.href = "/login";  // Redirect to login if sessionStorage is cleared
   }
});



function promptPassword(correctPassword, roomId) {
   // Show the modal
   document.getElementById('passwordModal').style.display = 'flex';
   

   // Store the correct password and roomId in variables
   window.correctPassword = correctPassword;
   window.roomId = roomId;

   // Focus on the password input field
   document.getElementById('roomPassword').focus();
}

function submitPassword() {
   const userPassword = document.getElementById('roomPassword').value;


   if (userPassword === window.correctPassword) {
       // Store room access in the session via an AJAX request
       fetch(`/admin/grant-access/${window.roomId}`, { method: 'POST' })
           .then(response => {
               if (response.ok) {
                   window.location.href = `/admin/dashboard/${window.roomId}`;
                   
   document.getElementById('loadingOverlay').style.display = 'flex';
               } else {
                   alert('Failed to grant access. Please try again.');
               }
           })
           .catch(error => console.error('Error:', error));
   } else {
       alert('Incorrect password. Please try again.');
   }

   // Close the modal
   closeModal();
}

function closeModal() {
   document.getElementById('passwordModal').style.display = 'none';
   document.getElementById('roomPassword').value = ''; // Clear the password input
}

function checkEnterKey(event) {
   if (event.key === 'Enter') {
       submitPassword();
   }
}




const searchInput = document.getElementById('search-input');
const searchForm = document.querySelector('form');

// Automatically submit the form when the search input is cleared
searchInput.addEventListener('input', () => {
   if (searchInput.value.trim() === '') {
       searchForm.submit(); // Automatically submit the form
   }
});



// Select the Create Room form
const createRoomForm = document.getElementById("createRoomModal");

// Attach a submit event listener
createRoomForm.addEventListener("submit", function (event) {
   // Show the loading overlay
   document.getElementById("loadingOverlay").style.display = "flex";
});




document.addEventListener("DOMContentLoaded", () => {
    const openModalButton = document.getElementById('openCreateRoomModal');
    const closeModalButton = document.getElementById('closeCreateRoomModal');
    const modal = document.getElementById('createRoomModal');



    // Check if elements exist before adding event listeners
    if (openModalButton && closeModalButton && modal) {
        // Open modal
        openModalButton.addEventListener('click', () => {
            console.log("Open Create Room Modal clicked!"); // Debug log
            modal.style.display = 'flex'; // Ensure modal is set to flex
        });

        // Close modal
        closeModalButton.addEventListener('click', () => {
            console.log("Close Create Room Modal clicked!"); // Debug log
            modal.style.display = 'none';
        });

        // Close modal when clicking outside the modal content
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    } else {
        console.error("Modal elements not found in the DOM. Check your HTML structure.");
    }
});

// Utility to show loading overlay
function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
}



// Function to handle "Forgot Password" click
function forgotPassword(roomId, email) {
   const loadingOverlay = document.getElementById('loadingOverlay');
   const notificationModal = document.getElementById('notificationModal');
   const notificationTitle = document.getElementById('notificationTitle');
   const notificationMessage = document.getElementById('notificationMessage');

   loadingOverlay.style.display = 'flex'; // Show loading overlay

   fetch('/forgot-room-password', {
       method: 'POST',
       headers: {
           'Content-Type': 'application/json',
       },
       body: JSON.stringify({ roomId, email }),
   })
       .then((response) => response.json())
       .then((data) => {
           loadingOverlay.style.display = 'none'; // Hide loading overlay
           notificationTitle.innerText = 'Success';
           notificationMessage.innerText = data.message || 'Password reset email sent.';
           notificationModal.style.display = 'flex'; // Show modal
       })
       .catch((error) => {
           console.error('Error processing password reset:', error);
           loadingOverlay.style.display = 'none'; // Hide loading overlay
           notificationTitle.innerText = 'Error';
           notificationMessage.innerText = 'An error occurred while sending the password reset email.';
           notificationModal.style.display = 'flex'; // Show modal
       });
}

// Function to close the notification modal
function closeNotificationModal() {
   const notificationModal = document.getElementById('notificationModal');
   notificationModal.style.display = 'none';
}


