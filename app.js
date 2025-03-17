function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  return date;
}

function isDateTodayOrLater(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function getStartOfWeek(date) {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay(); // Get current day of the week (0-6)
  const diff = startOfWeek.getDate() - day; // Adjust the date to the start of the week
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0); // Set time to the start of the day
  return startOfWeek;
}

function getEndOfWeek(date) {
  const endOfWeek = new Date(date);
  const day = endOfWeek.getDay(); // Get current day of the week (0-6)
  const diff = endOfWeek.getDate() + (6 - day); // Adjust the date to the end of the week
  endOfWeek.setDate(diff);
  endOfWeek.setHours(23, 59, 59, 999); // Set time to the end of the day
  return endOfWeek;
}

// Add a variable to track the current week offset (0 = current week, 1 = next week, etc.)
let currentWeekOffset = 0;

async function processFile(filePath, sessions) {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    jsonData.forEach((row) => {
      const columnBValue = row[1]; // date
      const columnEValue = row[4]; // details
      const columnFValue = row[5]; // session type
      const columnGValue = row[6]; // note
      const columnMValue = row[12]; // date
      const columnOValue = row[14]; // details
      const columnPValue = row[15]; // session type
      const columnQValue = row[16]; // note

      // Process all sessions, not just those in the current week
      if (typeof columnBValue === "number" && columnBValue > 0 && columnFValue) {
        const date = excelSerialToDate(columnBValue);
        if (isDateTodayOrLater(date)) {
          sessions.push({
            date: date,
            sessionType: columnFValue,
            details: columnEValue || "",
            note: columnGValue || "",
          });
        }
      }

      if (typeof columnMValue === "number" && columnMValue > 0 && columnPValue) {
        const date = excelSerialToDate(columnMValue);
        if (isDateTodayOrLater(date)) {
          sessions.push({
            date: date,
            sessionType: columnPValue,
            details: columnOValue || "",
            note: columnQValue || "",
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

function updateTimetableVisualization(sessions) {
  // Group sessions by day of week
  const sessionsByDay = {
    0: [], // Sunday
    1: [], // Monday
    2: [], // Tuesday
    3: [], // Wednesday
    4: [], // Thursday
    5: [], // Friday
    6: []  // Saturday
  };
  
  sessions.forEach(session => {
    const day = session.date.getDay();
    sessionsByDay[day].push(session);
  });
  
  // Create a reusable function for formatting the slots
  const updateSlot = (slot, session) => {
    if (session.sessionType === 'OPL' || session.sessionType === 'DSL') {
      slot.style.backgroundColor = 'rgb(132, 204, 132)';
    } else if (session.sessionType === 'PPL') {
      slot.style.backgroundColor = 'white';
    }
    
    const date = session.date.toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'});
    const textColor = session.sessionType === 'PPL' ? 'black' : 'white';
    
    // Enhanced mobile-friendly formatting
    slot.innerHTML = `
      <div style="padding: 5px; color: ${textColor}; text-align: center; overflow: hidden; width: 100%;">
        <div style="font-weight: bold; font-size: clamp(0.7rem, 1.5vw, 1.2rem); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${session.details}</div>
        <div style="font-size: clamp(0.6rem, 1.2vw, 1rem);">${date}</div>
        <div style="font-size: clamp(0.6rem, 1.2vw, 1rem);">${session.sessionType}</div>
      </div>
    `;
  };
  
  // Update Monday slot
  if (sessionsByDay[1].length > 0) {
    updateSlot(document.querySelector('.mon-slot'), sessionsByDay[1][0]);
  } else {
    document.querySelector('.mon-slot').innerHTML = '';
    document.querySelector('.mon-slot').style.backgroundColor = '#cfcfcf';
  }
  
  // Update Wednesday slot
  if (sessionsByDay[3].length > 0) {
    updateSlot(document.querySelector('.wed-slot'), sessionsByDay[3][0]);
  } else {
    document.querySelector('.wed-slot').innerHTML = '';
    document.querySelector('.wed-slot').style.backgroundColor = '#cfcfcf';
  }
  
  // Update Thursday slot
  if (sessionsByDay[4].length > 0) {
    updateSlot(document.querySelector('.thr-slot'), sessionsByDay[4][0]);
  } else {
    document.querySelector('.thr-slot').innerHTML = '';
    document.querySelector('.thr-slot').style.backgroundColor = '#cfcfcf';
  }
  
  // Update Friday slot
  if (sessionsByDay[5].length > 0) {
    updateSlot(document.querySelector('.fri-slot'), sessionsByDay[5][0]);
  } else {
    document.querySelector('.fri-slot').innerHTML = '';
    document.querySelector('.fri-slot').style.backgroundColor = '#cfcfcf';
  }
}

// Function to load all sessions for the current week offset, including past sessions
async function loadAllWeekSessions() {
  const sessions = [];

  const filePaths = [
    "./sheets/colic.xlsx",
    "./sheets/meyer.xlsx",
    "./sheets/rapisadra.xlsx",
  ];

  // Process all files without date filtering
  for (const filePath of filePaths) {
    try {
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      jsonData.forEach((row) => {
        const columnBValue = row[1]; // date
        const columnEValue = row[4]; // details
        const columnFValue = row[5]; // session type
        const columnGValue = row[6]; // note
        const columnMValue = row[12]; // date
        const columnOValue = row[14]; // details
        const columnPValue = row[15]; // session type
        const columnQValue = row[16]; // note

        // Process all sessions without date filtering
        if (typeof columnBValue === "number" && columnBValue > 0 && columnFValue) {
          const date = excelSerialToDate(columnBValue);
          sessions.push({
            date: date,
            sessionType: columnFValue,
            details: columnEValue || "",
            note: columnGValue || "",
          });
        }

        if (typeof columnMValue === "number" && columnMValue > 0 && columnPValue) {
          const date = excelSerialToDate(columnMValue);
          sessions.push({
            date: date,
            sessionType: columnPValue,
            details: columnOValue || "",
            note: columnQValue || "",
          });
        }
      });
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }

  sessions.sort((a, b) => a.date - b.date);

  // Calculate the start and end of the selected week based on the currentWeekOffset
  const today = new Date();
  const selectedDate = new Date(today.getTime() + currentWeekOffset * 7 * 24 * 60 * 60 * 1000);
  const startOfWeek = getStartOfWeek(selectedDate);
  const endOfWeek = getEndOfWeek(selectedDate);

  const sessionsThisWeek = sessions.filter(session => 
    session.date >= startOfWeek && session.date <= endOfWeek
  );
  console.log(`Sessions for week offset ${currentWeekOffset}:`, sessionsThisWeek);

  // Update the week display
  const weekDisplay = document.getElementById('week-display');
  if (weekDisplay) {
    weekDisplay.textContent = `${startOfWeek.toLocaleDateString('de-DE')} - ${endOfWeek.toLocaleDateString('de-DE')}`;
  }

  updateTimetableVisualization(sessionsThisWeek);
}

// Function to navigate to the previous week
function previousWeek() {
  currentWeekOffset--;
  loadAllWeekSessions();
}

// Function to navigate to the next week
function nextWeek() {
  currentWeekOffset++;
  loadAllWeekSessions();
}

// Function to reset to the current week
function currentWeek() {
  currentWeekOffset = 0;
  loadAllWeekSessions();
}

// Dark Mode functionality
function initDarkMode() {
  // Check for saved user preference or system preference
  const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                   (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && 
                    localStorage.getItem('darkMode') !== 'false');
  
  // Set initial state
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }
  
  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'dark-mode-toggle';
  toggleBtn.innerHTML = isDarkMode ? 
    '<i class="fas fa-lightbulb"></i>' : 
    '<i class="fas fa-moon"></i>';
  toggleBtn.setAttribute('aria-label', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  toggleBtn.title = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  
  // Add toggle functionality
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    toggleBtn.innerHTML = isDark ? 
      '<i class="fas fa-lightbulb"></i>' : 
      '<i class="fas fa-moon"></i>';
    toggleBtn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    toggleBtn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  });
  
  // Add button to the DOM
  document.body.appendChild(toggleBtn);
  
  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (localStorage.getItem('darkMode') === null) {
        if (e.matches) {
          document.body.classList.add('dark-mode');
          toggleBtn.innerHTML = '<i class="fas fa-lightbulb"></i>';
          toggleBtn.setAttribute('aria-label', 'Switch to Light Mode');
          toggleBtn.title = 'Switch to Light Mode';
        } else {
          document.body.classList.remove('dark-mode');
          toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
          toggleBtn.setAttribute('aria-label', 'Switch to Dark Mode');
          toggleBtn.title = 'Switch to Dark Mode';
        }
      }
    });
  }
}

// Add this function to create the stats button and handle the popup
function initStatsButton() {
  // Create stats button
  const statsBtn = document.createElement('button');
  statsBtn.id = 'stats-button';
  statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
  statsBtn.setAttribute('aria-label', 'View Statistics');
  statsBtn.title = 'View Statistics';
  
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  
  // Create popup container
  const popup = document.createElement('div');
  popup.className = 'stats-popup';
  
  // Add close button to popup
  const closeBtn = document.createElement('div');
  closeBtn.className = 'stats-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = function() {
    popup.style.display = 'none';
    overlay.style.display = 'none';
  };
  
  popup.appendChild(closeBtn);
  
  // Add button click event
  statsBtn.addEventListener('click', async function() {
    // Show loading state
    popup.innerHTML = '<h2>Loading Statistics...</h2>';
    popup.appendChild(closeBtn);
    popup.style.display = 'block';
    overlay.style.display = 'block';
    
    // Calculate and display stats
    await calculateAndDisplayStats(popup);
  });
  
  // Add elements to DOM
  document.body.appendChild(statsBtn);
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  
  // Close popup when clicking overlay
  overlay.addEventListener('click', function() {
    popup.style.display = 'none';
    overlay.style.display = 'none';
  });
}

// Function to calculate and display statistics
async function calculateAndDisplayStats(popup) {
  const sessions = await getAllSessions();
  
  if (!sessions || sessions.length === 0) {
    popup.innerHTML = '<h2>Statistics</h2><p>No session data available.</p>';
    const closeBtn = document.createElement('div');
    closeBtn.className = 'stats-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = function() {
      popup.style.display = 'none';
      document.querySelector('.popup-overlay').style.display = 'none';
    };
    popup.appendChild(closeBtn);
    return;
  }
  
  // Calculate stats
  const stats = {
    total: sessions.length,
    byType: {
      OPL: sessions.filter(s => s.sessionType === 'OPL').length,
      DSL: sessions.filter(s => s.sessionType === 'DSL').length,
      PPL: sessions.filter(s => s.sessionType === 'PPL').length
    },
    byTeacher: {}
  };
  
  // Count by teacher and session type
  sessions.forEach(session => {
    // Extract teacher from filename in details
    const teacher = session.details.includes('colic') ? 'Colic' : 
                   session.details.includes('meyer') ? 'Meyer' : 
                   session.details.includes('rapisadra') ? 'Rapisarda' : 'Unknown';
    
    if (!stats.byTeacher[teacher]) {
      stats.byTeacher[teacher] = {
        total: 0,
        OPL: 0,
        DSL: 0,
        PPL: 0
      };
    }
    
    stats.byTeacher[teacher].total++;
    stats.byTeacher[teacher][session.sessionType]++;
  });
  
  // Calculate percentages
  const oplDslPercent = ((stats.byType.OPL + stats.byType.DSL) / stats.total * 100).toFixed(1);
  const pplPercent = (stats.byType.PPL / stats.total * 100).toFixed(1);
  
  // Build HTML
  let html = `
    <h2>Session Statistics</h2>
    <div class="stats-section">
      <h3>Overall</h3>
      <div class="stats-row">
        <div>Total Sessions:</div>
        <div>${stats.total}</div>
      </div>
      <div class="stats-row">
        <div>OPL/DSL Sessions:</div>
        <div>${stats.byType.OPL + stats.byType.DSL} (${oplDslPercent}%)</div>
      </div>
      <div class="stats-row">
        <div>PPL Sessions:</div>
        <div>${stats.byType.PPL} (${pplPercent}%)</div>
      </div>
      
      <div class="stats-bar">
        <div class="stats-bar-label">${oplDslPercent}% OPL/DSL - ${pplPercent}% PPL</div>
      </div>
    </div>
    
    <div class="stats-section">
      <h3>By Teacher</h3>
  `;
  
  // Add teacher stats
  for (const [teacher, data] of Object.entries(stats.byTeacher)) {
    const teacherOplDslPercent = ((data.OPL + data.DSL) / data.total * 100).toFixed(1);
    const teacherPplPercent = (data.PPL / data.total * 100).toFixed(1);
    
    html += `
      <div class="stats-row">
        <div>${teacher}:</div>
        <div>${data.total} sessions</div>
      </div>
      <div class="stats-row">
        <div>OPL/DSL: ${data.OPL + data.DSL} (${teacherOplDslPercent}%)</div>
        <div>PPL: ${data.PPL} (${teacherPplPercent}%)</div>
      </div>
    `;
  }
  
  // Close the HTML
  html += `</div>`;
  
  popup.innerHTML = html;
  
  // Re-add close button
  const closeBtn = document.createElement('div');
  closeBtn.className = 'stats-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = function() {
    popup.style.display = 'none';
    document.querySelector('.popup-overlay').style.display = 'none';
  };
  popup.appendChild(closeBtn);
  
  // Update the stats bar width to match the percentage
  const statsBar = popup.querySelector('.stats-bar');
  if (statsBar) {
    statsBar.style.background = `linear-gradient(to right, 
      #1a4d1a 0%, 
      #1a4d1a ${oplDslPercent}%, 
      #666666 ${oplDslPercent}%, 
      #666666 100%)`;
  }
}

// Function to get all sessions across all Excel files
async function getAllSessions() {
  const sessions = [];
  const filePaths = [
    "./sheets/colic.xlsx",
    "./sheets/meyer.xlsx",
    "./sheets/rapisadra.xlsx",
  ];

  for (const filePath of filePaths) {
    try {
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      jsonData.forEach((row) => {
        const columnBValue = row[1]; // date
        const columnEValue = row[4]; // details
        const columnFValue = row[5]; // session type
        const columnGValue = row[6]; // note
        const columnMValue = row[12]; // date
        const columnOValue = row[14]; // details
        const columnPValue = row[15]; // session type
        const columnQValue = row[16]; // note

        if (typeof columnBValue === "number" && columnBValue > 0 && columnFValue) {
          const date = excelSerialToDate(columnBValue);
          sessions.push({
            date: date,
            sessionType: columnFValue,
            details: filePath, // Store file path to identify teacher
            note: columnGValue || "",
          });
        }

        if (typeof columnMValue === "number" && columnMValue > 0 && columnPValue) {
          const date = excelSerialToDate(columnMValue);
          sessions.push({
            date: date,
            sessionType: columnPValue,
            details: filePath, // Store file path to identify teacher
            note: columnQValue || "",
          });
        }
      });
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }

  return sessions;
}

window.onload = function() {
  loadAllWeekSessions();  // For the timetable visualization with all week sessions
  loadExcelFilesTable();  // For the table display
  initDarkMode();
  initStatsButton();
};