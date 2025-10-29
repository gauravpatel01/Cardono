// Global variables
let responses = [];
let isAdminMode = false;
let isEnvelopeOpened = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadResponses();
    initHeroAnimation();
});

function initializeApp() {
    // Envelope click functionality
    const envelope = document.getElementById('envelope');
    envelope.addEventListener('click', openEnvelope);
    
    // RSVP form submission
    const rsvpForm = document.querySelector('.guest-form');
    rsvpForm.addEventListener('submit', handleRSVPSubmit);
    
    // Calendar buttons
    const calendarButtons = document.querySelectorAll('.calendar-btn');
    calendarButtons.forEach(button => {
        button.addEventListener('click', handleCalendarClick);
    });

    // Details panel actions
    const viewMapBtn = document.getElementById('detailsViewMap');
    const addCalBtn = document.getElementById('detailsAddCalendar');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (viewMapBtn) {
        viewMapBtn.addEventListener('click', () => {
            const location = 'The Grand Ballroom, Downtown Plaza';
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
        });
    }
    if (addCalBtn) {
        addCalBtn.addEventListener('click', () => {
            addToGoogleCalendar(getEventDetails());
        });
    }
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            const card = document.getElementById('invitationCard');
            if (!card.classList.contains('flipped')) card.classList.add('flipped');
            const nameInput = document.getElementById('guestName');
            if (nameInput) nameInput.focus();
        });
    }
    
    // Details close button
    const detailsCloseButton = document.getElementById('detailsCloseButton');
    if (detailsCloseButton) {
        detailsCloseButton.addEventListener('click', closeDetailsPanel);
    }
    
    // Load saved responses from localStorage
    loadResponses();
}

// GSAP animation
function initHeroAnimation() {
    if (typeof gsap === 'undefined') return;

    const scene = document.getElementById('heroScene');
    if (!scene) return;

    const frameGift = document.getElementById('frameGift');
    const frameClosed = document.getElementById('frameClosed');
    const frameOpen = document.getElementById('frameOpen');
    
    const framePeek = document.getElementById('framePeek');
    const frameFull = document.getElementById('frameFull');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');

    // Layering: back envelope, peeking card above it, then full card on very top
    gsap.set(frameGift, { zIndex: 2 });
    gsap.set(frameClosed, { zIndex: 3 });
    gsap.set(frameOpen, { zIndex: 4 });
    gsap.set(framePeek, { zIndex: 8 });
    gsap.set(frameFull, { zIndex: 12 });

    scene.setAttribute('role', 'button');
    scene.setAttribute('tabindex', '0');
    scene.setAttribute('aria-label', 'Play invitation animation. Click to advance.');

    // Desktop centering offset so final card sits in middle vertically
    const isDesktop = window.matchMedia('(min-width: 1025px)').matches;
    const finalCardScale = isDesktop ? 0.85 : 1;
    const centerYOffset = isDesktop ? -80 : 0;

    gsap.set([frameGift, frameClosed, frameOpen, framePeek, frameFull], {
        autoAlpha: 0,
        scale: 1,
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: centerYOffset
    });
    gsap.set(frameGift, { autoAlpha: 1 });
    gsap.set(frameFull, { transformOrigin: 'center bottom' });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => {
        if (viewDetailsBtn) gsap.to(viewDetailsBtn, { autoAlpha: 1, display: 'flex', duration: 0.25 });
    }});

    // 1)
    tl.from(frameGift, { y: centerYOffset + 20, duration: 0.6 });
    tl.to(frameGift, { y: centerYOffset, duration: 0.4 });
    tl.addPause('+=0.2'); 

    // 2)
    tl.to(frameGift, { autoAlpha: 0, duration: 0.25 }, 'closedSwitch');
    tl.fromTo(frameClosed, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, 'closedSwitch');
    tl.addPause('+=0.25');

    // 3) Open envelope
    tl.to(frameClosed, { autoAlpha: 0, duration: 0.2 }, 'openSwap');
    tl.fromTo(frameOpen, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, 'openSwap');
    tl.addPause('+=0.2');

    
    gsap.set(framePeek, { scale: 0.52, y: 130 + centerYOffset });
    tl.fromTo(
        framePeek,
        { autoAlpha: 0, y: 130 + centerYOffset, scale: 0.52 },
        { autoAlpha: 1, y: 0 + centerYOffset, scale: 0.56, duration: 0.55, ease: 'power2.out' }
    );
    tl.to(framePeek, { y: -90 + centerYOffset, duration: 0.9, ease: 'power2.inOut' });
    tl.addPause('+=0.1');

    // 5) Reveal full card
    tl.to([frameOpen, framePeek], { autoAlpha: 0, duration: 0.25 }, 'revealFull');
    tl.fromTo(
        frameFull,
        { autoAlpha: 0, scale: 0.9, y: centerYOffset },
        { autoAlpha: 1, scale: finalCardScale, y: centerYOffset, duration: 0.7 },
        'revealFull+=0.05'
    );
    tl.to(frameFull, { y: centerYOffset - 8, duration: 1.6, ease: 'sine.inOut' })
      .to(frameFull, { y: centerYOffset, duration: 1.6, ease: 'sine.inOut' });

    if (viewDetailsBtn) gsap.set(viewDetailsBtn, { autoAlpha: 0, display: 'none' });

    scene.addEventListener('click', () => tl.play()); // play from pauses
    scene.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tl.play(); } });
    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = document.getElementById('invitationCard');
            if (!card.classList.contains('flipped')) card.classList.add('flipped');
            document.body.classList.add('card-flipped');
        });
    }
}

function openEnvelope() {
    if (isEnvelopeOpened) return;
    
    isEnvelopeOpened = true;
    const envelope = document.getElementById('envelope');
    const envelopeInside = document.getElementById('envelopeInside');
    const cardContainer = document.getElementById('cardContainer');
    const envelopeText = envelope.querySelector('.envelope-text');
    const envelopeSeal = envelope.querySelector('.envelope-seal');
    
    
    envelope.classList.add('rotated');
    
  
    if (envelopeText) envelopeText.style.opacity = '0'; 
    

    setTimeout(() => {
        cardContainer.classList.add('visible'); 
    
        envelope.style.display = 'none'; 
    }, 1000); 
}

function closeDetailsPanel() {
    document.body.classList.remove('card-flipped');
}

function flipCard() {
    const card = document.getElementById('invitationCard');
    card.classList.toggle('flipped');
    if (card.classList.contains('flipped')) {
        document.body.classList.add('card-flipped');
    } else {
        document.body.classList.remove('card-flipped');
    }
}

function handleRSVPSubmit(e) {
    e.preventDefault();
    
  
    const name = document.getElementById('guestName').value.trim();
    const email = document.getElementById('guestEmail').value.trim();
    const guestCount = document.getElementById('guestCount').value;
    const specialMessage = document.getElementById('specialMessage').value.trim();
    
    // Validation
    if (!name || !email) {
        alert('Please fill in all required fields.');
        return;
    }
    
    if (!isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    // Create response object
    const response = {
        id: Date.now(),
        name: name,
        email: email,
        attendance: 'yes', // Default to attending since we removed the choice
        guestCount: parseInt(guestCount),
        specialMessage: specialMessage,
        timestamp: new Date().toISOString()
    };
    
    // Add to responses array
    responses.push(response);
    
    // Save to localStorage
    saveResponses();
    
    // Update admin panel if visible
    if (isAdminMode) {
        updateAdminPanel();
    }
    
    // Show success message
    showSuccessMessage();
    
    // Reset form
    document.querySelector('.guest-form').reset();
    
    // Flip card back to front after a delay
    setTimeout(() => {
        const card = document.getElementById('invitationCard');
        card.classList.remove('flipped');
    }, 2000);
}

function handleCalendarClick(e) {
    const calendarType = e.currentTarget.dataset.calendar;
    const eventDetails = getEventDetails();
    
    switch(calendarType) {
        case 'google':
            addToGoogleCalendar(eventDetails);
            break;
        case 'outlook':
            addToOutlookCalendar(eventDetails);
            break;
        case 'ical':
            addToICalendar(eventDetails);
            break;
    }
}

function getEventDetails() {
    return {
        title: 'You\'re Invited - Cardono Event',
        description: 'Join us for an amazing event hosted by Cardono',
        location: 'The Grand Ballroom, Downtown Plaza',
        startDate: '20241214',
        startTime: '190000',
        endDate: '20241214',
        endTime: '230000'
    };
}

function addToGoogleCalendar(eventDetails) {
    const startDateTime = `${eventDetails.startDate}T${eventDetails.startTime}Z`;
    const endDateTime = `${eventDetails.endDate}T${eventDetails.endTime}Z`;
    
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(eventDetails.description)}&location=${encodeURIComponent(eventDetails.location)}`;
    
    window.open(googleUrl, '_blank');
}

function addToOutlookCalendar(eventDetails) {
    const startDateTime = `${eventDetails.startDate}T${eventDetails.startTime}Z`;
    const endDateTime = `${eventDetails.endDate}T${eventDetails.endTime}Z`;
    
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(eventDetails.title)}&startdt=${startDateTime}&enddt=${endDateTime}&body=${encodeURIComponent(eventDetails.description)}&location=${encodeURIComponent(eventDetails.location)}`;
    
    window.open(outlookUrl, '_blank');
}

function addToICalendar(eventDetails) {
    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cardono//Event//EN
BEGIN:VEVENT
UID:${Date.now()}@cardono.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${eventDetails.startDate}T${eventDetails.startTime}Z
DTEND:${eventDetails.endDate}T${eventDetails.endTime}Z
SUMMARY:${eventDetails.title}
DESCRIPTION:${eventDetails.description}
LOCATION:${eventDetails.location}
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cardono-event.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.add('show');
}

function closeSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.remove('show');
}

function toggleAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    const adminToggle = document.getElementById('adminToggle');
    
    isAdminMode = !isAdminMode;
    
    if (isAdminMode) {
        adminPanel.classList.add('show');
        adminToggle.innerHTML = '<i class="fas fa-times"></i>';
        updateAdminPanel();
    } else {
        adminPanel.classList.remove('show');
        adminToggle.innerHTML = '<i class="fas fa-cog"></i> Host View';
    }
}

function updateAdminPanel() {
    const totalResponses = document.getElementById('totalResponses');
    const attendingCount = document.getElementById('attendingCount');
    const notAttendingCount = document.getElementById('notAttendingCount');
    const responsesContainer = document.getElementById('responsesContainer');
    
    // Update stats
    const attending = responses.filter(r => r.attendance === 'yes');
    const notAttending = responses.filter(r => r.attendance === 'no');
    
    totalResponses.textContent = responses.length;
    attendingCount.textContent = attending.length;
    notAttendingCount.textContent = notAttending.length;
    
    // Update responses list
    responsesContainer.innerHTML = '';
    
    if (responses.length === 0) {
        responsesContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No responses yet.</p>';
        return;
    }
    
    responses.forEach(response => {
        const responseElement = document.createElement('div');
        responseElement.className = `response-item ${response.attendance === 'no' ? 'not-attending' : ''}`;
        
        const attendanceText = response.attendance === 'yes' ? 'Attending' : 'Not Attending';
        const guestText = response.guestCount > 1 ? ` (${response.guestCount} guests)` : '';
        const messageText = response.specialMessage ? `<br><small>💝 Message: "${response.specialMessage}"</small>` : '';
        
        responseElement.innerHTML = `
            <div class="response-name">${response.name}</div>
            <div class="response-details">
                ${attendanceText}${guestText}${messageText}<br>
                <small>${new Date(response.timestamp).toLocaleDateString()}</small>
            </div>
        `;
        
        responsesContainer.appendChild(responseElement);
    });
}

function saveResponses() {
    localStorage.setItem('cardonoResponses', JSON.stringify(responses));
}

function loadResponses() {
    const savedResponses = localStorage.getItem('cardonoResponses');
    if (savedResponses) {
        responses = JSON.parse(savedResponses);
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Close admin panel when clicking outside
document.addEventListener('click', function(e) {
    const adminPanel = document.getElementById('adminPanel');
    const adminToggle = document.getElementById('adminToggle');
    
    if (isAdminMode && !adminPanel.contains(e.target) && !adminToggle.contains(e.target)) {
        toggleAdminPanel();
    }
});

// Close success message when clicking outside
document.addEventListener('click', function(e) {
    const successMessage = document.getElementById('successMessage');
    const successContent = document.querySelector('.success-content');
    
    if (successMessage.classList.contains('show') && !successContent.contains(e.target)) {
        closeSuccessMessage();
    }
});

// Add some sample data for demonstration
function addSampleData() {
    const sampleResponses = [
        {
            id: 1,
            name: 'John Smith',
            email: 'john@example.com',
            attendance: 'yes',
            guestCount: 2,
            specialMessage: 'So excited to celebrate with you both! Can\'t wait for this special day! 💕',
            timestamp: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 2,
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            attendance: 'yes',
            guestCount: 1,
            specialMessage: 'Thank you for the beautiful invitation. Looking forward to seeing everyone!',
            timestamp: new Date(Date.now() - 172800000).toISOString()
        },
        {
            id: 3,
            name: 'Mike Davis',
            email: 'mike@example.com',
            attendance: 'no',
            guestCount: 1,
            specialMessage: 'Wishing you a wonderful celebration! Sorry I can\'t make it this time.',
            timestamp: new Date(Date.now() - 259200000).toISOString()
        }
    ];
    
    if (responses.length === 0) {
        responses = sampleResponses;
        saveResponses();
    }
}

// Uncomment the line below to add sample data for demonstration
// addSampleData();

document.getElementById('envelopeFront').addEventListener('click', function() {
    document.getElementById('envelopeFront').style.display = 'none'; // Hide first page
    document.getElementById('cardContainer').style.display = 'block'; // Show card
});
