/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

let fileContent = '';
let customFilters = [];
const zipRegex = /^bugreport-.*\.txt$/i;
const searchStrings = {
   "com.google.android.devicelock.apex": "yellow",
   "SetupParameters": "lightblue",
   "DeviceCheckInClient": "yellow",
   "DeviceCheckInHelper": "lightgreen",
   "DeviceLockNotificationManager": "orange",
   "DeviceLockControllerSchedulerImpl": "lightcoral",
   "DeviceLockService": "lightpink",
   "DeviceLockController": "lightgoldenrodyellow",
   "CheckInBootCompletedReceiver": "thistle",
   "DeviceLockCommandReceiver": "lightsalmon",
   "LockTaskModePolicyHandler": "lightcyan",
   "StartLockTaskModeWorker": "lightseagreen",
   "PlayInstallServiceConnectionImpl": "lavender",
   "ProvisionHelperImpl": "lightsteelblue",
   "DevicePolicyControllerImpl": "peachpuff",
   "getDeviceCheckInStatus": "plum",
   "DeviceLockFirebaseMessagingService": "powderblue",
   "CheckInWorker": "cornflowerblue",
   "RoleControllerManager": "tan",
   "RolePolicyHandler": "khaki"
};
const criticalStrings = ["Not in eligible country", "device reset", "App installation failed", "Failed to add financed device kiosk role"];
const states = {
   checkInResponse: {
      0: "STATUS_UNSPECIFIED",
      1: "RETRY_CHECK_IN",
      2: "READY_FOR_PROVISION",
      3: "STOP_CHECK_IN"
   },
   deviceState: {
      0: "UNDEFINED",
      1: "UNLOCKED",
      2: "LOCKED",
      3: "CLEARED"
   },
   provisionState: {
      0: "UNPROVISIONED",
      1: "PROVISIONING IS IN PROGRESS",
      2: "PROVISIONING PAUSED",
      3: "KIOSK PROVISIONED",
      4: "PROVISIONING SUCCEEDED",
      5: "PROVISIONING FAILED"
   }
};
const installStatusCodes = {
   "0": "SUCCESS",
   "-1": "CALLER_VERIFICATION_FAILURE",
   "-2": "POLICY_VIOLATION",
   "-3": "API_DISABLED",
   "-4": "REQUEST_FAILED",
   "-5": "ALREADY_UP_TO_DATE",
   "-6": "DOCUMENT_UNAVAILABLE",
   "-7": "UNABLE_TO_PURCHASE",
   "-8": "ACCOUNT_ERROR",
   "-9": "INVALID_ANDROID_ID_ERROR"
};
const customFilterColors = {};
let aiAnalysisDone = false;

function getRandomColor() {
   const colors = ["#ffcc80", "#b39ddb", "#80deea", "#ffab91", "#c5e1a5", "#f48fb1", "#ce93d8"];
   return colors[Math.floor(Math.random() * colors.length)];
}

function handleFileSelect(event) {
   const file = event.target.files[0];
   if (!file) return;
   aiAnalysisDone = false;
   resetContextualLogs();
   const fileExtension = file.name.split('.').pop().toLowerCase();
   if (fileExtension === 'zip') {
      handleZipFile(file);
   } else if (fileExtension === 'txt' || fileExtension === 'log') {
      handleTextFile(file);
   } else {
      alert('Invalid file type. Please upload a .txt, .log, or .zip file.');
   }
}

function handleTextFile(file) {
   const reader = new FileReader();
   reader.onload = function (e) {
      fileContent = e.target.result;
      document.getElementById('processButton').disabled = false;
   };
   reader.readAsText(file);
}
async function handleZipFile(file) {
   const reader = new FileReader();
   reader.onload = async function (e) {
      const zip = new JSZip();
      try {
         const zipContent = await zip.loadAsync(e.target.result);
         let targetFile;
         zip.forEach((relativePath, zipEntry) => {
            if (zipRegex.test(zipEntry.name)) {
               targetFile = zipEntry;
            }
         });
         if (targetFile) {
            const extractedContent = await targetFile.async('string');
            fileContent = extractedContent;
            document.getElementById('processButton').disabled = false;
         } else {
            alert('No bugreport file found in the ZIP.');
         }
      } catch (error) {
         console.error('Error reading ZIP file:', error);
         alert('Failed to extract the ZIP file.');
      }
   };
   reader.readAsArrayBuffer(file);
}

function processFile() {
   if (!fileContent) {
      alert('No file content available to process.');
      return;
   }
   const lines = fileContent.split('\n');
   const filteredDlcLines = [];
   const uniqueLines = new Set();
   const stateTimeline = [];
   let lastProvisionState = null;
   let kioskInstallationStatus = null;
   let packageName = null;
   let installationStatus = null;
   let buildFingerprint = null;
   let ineligibleCountryDetected = false; 
   const dateTimeRegex = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/;
   const combinedFilters = [...activeFilters, ...customFilters];
   lines.forEach((line, index) => {
      if (!dateTimeRegex.test(line) && !line.includes("Build fingerprint:")) return;
      let isMatched = false;
      const isCriticalLine = criticalStrings.some(critical => line.includes(critical));
      if (isCriticalLine) {
         filteredDlcLines.push(
            `<div style="background-color: red; color: white; font-weight: bold; padding: 5px;" data-line-index="${index}" onclick="showContext(${index})">${line}</div>`
         );
         uniqueLines.add(line);
      }
      combinedFilters.forEach(filter => {
         if (line.includes(filter) && !uniqueLines.has(line)) {
            let color;
            if (searchStrings[filter]) {
               color = searchStrings[filter];
            } else {
               if (!customFilterColors[filter]) {
                  customFilterColors[filter] = getRandomColor();
               }
               color = customFilterColors[filter];
            }
            filteredDlcLines.push(
               `<div style="background-color:${color}; padding: 5px;" data-line-index="${index}" onclick="showContext(${index})">${line}</div>`
            );
            uniqueLines.add(line);
            isMatched = true;
         }
      });
      if (line.includes("Build fingerprint:")) {
         const match = line.match(/Build fingerprint: '(.+?)'/);
         if (match) {
            buildFingerprint = match[1];
         }
      }
      if (line.includes("ProvisionHelperImpl: Kiosk app is pre-installed")) {
         kioskInstallationStatus = "PRE-INSTALLED";
      } else if (line.includes("ProvisionHelperImpl: Kiosk app is not pre-installed")) {
         kioskInstallationStatus = "NOT PRE-INSTALLED";
      }
      if (line.includes("PlayInstallServiceConnectionImpl: Downloading")) {
         const match = line.match(/Downloading ([\w.]+) from Play/);
         if (match) {
            packageName = match[1];
         }
      }

     if (!packageName && line.includes("StartLockTaskModeWorker: Launching activity for intent:")) {
         const match = line.match(/pkg=([\w.]+)/);
         if (match) {
             packageName = match[1];
         }
     }
      
      if (line.includes("PlayInstallServiceConnectionImpl: App installation result bundle")) {
         const match = line.match(/status_code=(-?\d+)/);
         if (match) {
            const statusCode = parseInt(match[1]);
            installationStatus = installStatusCodes[statusCode] || "UNKNOWN";
         }
      }
      if (line.includes("DeviceCheckInHelper: check in response:")) {
         const match = line.match(/check in response: (\d+)/);
         if (match) {
            const checkInCode = parseInt(match[1]);
            const checkInState = states.checkInResponse[checkInCode] || "UNKNOWN";
            addToTimeline(stateTimeline, line, `Server Check-in State: ${checkInState}`);
         }
      }
      if (line.includes("DevicePolicyControllerImpl: Enforcing policies for provision state")) {
         const match = line.match(/provision state (\d+) and device state (\d+)/);
         if (match) {
            const provisionState = states.provisionState[parseInt(match[1])] || "UNKNOWN";
            const deviceState = states.deviceState[parseInt(match[2])] || "UNKNOWN";
            lastProvisionState = parseInt(match[1]);
            addToTimeline(stateTimeline, line, `Provisioning State: ${provisionState}, Device State: ${deviceState}`);
         }
      }
      if (line.includes("DeviceLockService: onUserAdded")) {
         const match = line.match(/UserHandle\{(\d+)\}/);
         if (match) {
            const userId = match[1];
            addToTimeline(stateTimeline, line, `User Added: User ID ${userId}`);
         }
      }
      if (line.includes("DeviceLockService: onUserSwitching")) {
         const match = line.match(/from: (\d+) to: (\d+)/);
         if (match) {
            const fromUser = match[1];
            const toUser = match[2];
            addToTimeline(stateTimeline, line, `User Switching: From User ID ${fromUser} to User ID ${toUser}`);
         }
      }
      if (line.includes("DeviceLockServiceImpl: User switching reported for:")) {
         const match = line.match(/UserHandle\{(\d+)\}/);
         if (match) {
            const userId = match[1];
            addToTimeline(stateTimeline, line, `User Switch Reported: User ID ${userId}`);
         }
      }
      if (line.includes("ProvisionHelperImpl: Not in eligible country")) {
         ineligibleCountryDetected = true;
      }
      if (!isMatched && combinedFilters.length > 0) return;
   });
   updateKioskStatus(kioskInstallationStatus, packageName, installationStatus, buildFingerprint);
   updateDeviceStatus(lastProvisionState, installationStatus, ineligibleCountryDetected);
   displayTimeline(stateTimeline);
   updateDLCImplementationStatus(fileContent);
   document.getElementById('dlcOutput').innerHTML = filteredDlcLines.length > 0 ?
      filteredDlcLines.join('') :
      `<div style="color: red; text-align: center;">No logs match the selected filters. Please adjust the filters from the settings.</div>`;
   if (!aiAnalysisDone) {
      analyzeWithAI();
      aiAnalysisDone = true;
   }
   enableRoleHolderButton();
}

function toggleContextualLogs() {
   const contentDiv = document.getElementById('contextLogsContent');
   const toggleIcon = document.getElementById('contextToggleIcon');
   if (contentDiv.style.display === 'none') {
      contentDiv.style.display = 'block';
      toggleIcon.textContent = '[-]';
   } else {
      contentDiv.style.display = 'none';
      toggleIcon.textContent = '[+]';
   }
}

function showContext(lineIndex) {
   const lines = fileContent.split('\n');
   const start = Math.max(0, lineIndex - 10);
   const end = Math.min(lines.length, lineIndex + 10);
   const contextualLines = lines.slice(start, end).map((line, idx) => {
      const absoluteIndex = start + idx;
      if (absoluteIndex === lineIndex) {
         return `<div style="background-color: yellow; color: black; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 2px;">${line}</div>`;
      }
      return `<div style="white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 2px;">${line}</div>`;
   }).join('');
   const contextLogsOutput = document.getElementById('contextLogsOutput');
   contextLogsOutput.innerHTML = contextualLines;
   const contentDiv = document.getElementById('contextLogsContent');
   const toggleIcon = document.getElementById('contextToggleIcon');
   contentDiv.style.display = 'block';
   toggleIcon.textContent = '[-]';
}

function resetContextualLogs() {
   const contextLogsOutput = document.getElementById('contextLogsOutput');
   const contextLogsContent = document.getElementById('contextLogsContent');
   const contextToggleIcon = document.getElementById('contextToggleIcon');
   contextLogsOutput.innerHTML = '';
   contextLogsContent.style.display = 'none';
   contextToggleIcon.textContent = '[+]';
}

function selectAllFilters() {
   const checkboxes = document.querySelectorAll('#filterList input[type="checkbox"]');
   activeFilters = [];
   checkboxes.forEach(checkbox => {
      checkbox.checked = true;
      activeFilters.push(checkbox.value);
   });
   processFile();
}

function deselectAllFilters() {
   const checkboxes = document.querySelectorAll('#filterList input[type="checkbox"]');
   checkboxes.forEach(checkbox => {
      checkbox.checked = false;
   });
   activeFilters = [];
   processFile();
}

function searchLogs() {
   const input = document.getElementById("logSearchInput").value.toLowerCase();
   const logsContainer = document.getElementById("dlcOutput");
   const filteredLogs = Array.from(logsContainer.children);
   const searchTerms = input.split(",").map(term => term.trim()).filter(term => term);
   const filterTagsContainer = document.getElementById("filterTags");
   filterTagsContainer.textContent = searchTerms.length > 0 ? searchTerms.join(", ") : "None";
   filteredLogs.forEach(log => {
      const logText = log.textContent.toLowerCase();
      if (
         searchTerms.length === 0 ||
         searchTerms.some(term => logText.includes(term))
      ) {
         log.style.display = "block";
      } else {
         log.style.display = "none";
      }
   });
}

function togglePanels() {
   const mainLayout = document.querySelector('.main-layout');
   const uploadSection = document.querySelector('.upload-section');
   const toggleButton = document.querySelector('.panel-toggle i');
   const logsSection = document.querySelector('.logs-section');
   if (mainLayout.classList.contains('retracted')) {
      mainLayout.classList.remove('retracted');
      uploadSection.style.display = 'flex';
      toggleButton.classList.remove('fa-chevron-down');
      toggleButton.classList.add('fa-chevron-up');
      logsSection.style.maxHeight = '40vh';
   } else {
      mainLayout.classList.add('retracted');
      uploadSection.style.display = 'none';
      toggleButton.classList.remove('fa-chevron-up');
      toggleButton.classList.add('fa-chevron-down');
      logsSection.style.maxHeight = '80vh';
   }
}


async function analyzeWithAI() {
   const filteredLogs = document.getElementById('dlcOutput').innerText.trim();
   if (!filteredLogs) {
      alert("No filtered logs available to analyze.");
      return;
   }
   const apiKey = "your-api-key-here";
   const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
   const payload = {
      contents: [{
         parts: [{
            text: `
                                        Summarize the following logs. Include information about:
                                        1. Key events and transitions logged in the timeline.
                                        2. Any critical errors or warnings encountered.
                                        3. The kiosk app's installation status and any relevant information about its behavior. Make sure to do this for every user created
                                        4. The provisioning states and their transitions, including whether provisioning succeeded, failed, or is ongoing. Make sure to do this for every user created
                                        5. Insights into the device's lock/unlock states and the check-in responses from the server.
                                        6. Any other observations that could help diagnose issues or provide clarity about the device's operation.

                                        Use the following state definitions to interpret the logs:
                                        - Check-in Response States:
                                            0: STATUS_UNSPECIFIED
                                            1: RETRY_CHECK_IN
                                            2: READY_FOR_PROVISION
                                            3: STOP_CHECK_IN
                                        - Device States:
                                            0: UNDEFINED
                                            1: UNLOCKED
                                            2: LOCKED
                                            3: CLEARED
                                        - Provisioning States:
                                            0: UNPROVISIONED
                                            1: PROVISIONING IS IN PROGRESS
                                            2: PROVISIONING PAUSED
                                            3: KIOSK PROVISIONED
                                            4: PROVISIONING SUCCEEDED
                                            5: PROVISIONING FAILED

                                        At max, it should be 1-2 paragraphs.

                                        Logs:
                                        ${filteredLogs}
                                    `
         }]
      }]
   };

   const insightsButton = document.getElementById('toggleInsightsButton');
   const loader = document.getElementById('insightsLoader');

   insightsButton.disabled = true;
   loader.style.display = "inline-block";

   try {
      const response = await fetch(url, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify(payload),
      });
      if (!response.ok) {
         throw new Error(`API error: ${response.statusText}`);
      }
      const data = await response.json();
      const rawInsights = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No insights were generated.";
      const formattedInsights = beautifyInsights(rawInsights);
      document.getElementById('aiInsights').innerHTML = beautifyInsights(rawInsights);

      insightsButton.disabled = false;
      insightsButton.style.cursor = "pointer";
      insightsButton.innerText = "Show Insights";
   } catch (error) {
      document.getElementById('aiInsights').innerHTML = `<p>Error fetching insights: ${error.message}</p>`;
   } finally {
      loader.style.display = "none";
   }
}

function beautifyInsights(rawText) {
   const cleanedText = rawText.trim().replace(/\n\s*\n/g, '\n\n');
   const paragraphs = cleanedText.split('\n\n');
   return `
                    ${paragraphs
                        .map(paragraph => `<div style="margin-bottom: 10px; font-size: 1rem; color: #555;">${paragraph.trim()}</div>`)
                        .join('')}
                `;
}

function toggleInsights() {
   const insightsDiv = document.getElementById('aiInsights');
   const toggleButton = document.getElementById('toggleInsightsButton');
   if (insightsDiv.style.display === "none") {
      insightsDiv.style.display = "block";
      toggleButton.innerText = "Hide Insights";
   } else {
      insightsDiv.style.display = "none";
      toggleButton.innerText = "Show Insights";
   }
}

function wrapInStyledDiv(line, backgroundColor, textColor) {
   return `<div style="background-color: ${backgroundColor}; color: ${textColor}; padding: 5px; margin-bottom: 2px; border-radius: 4px;">${line}</div>`;
}

function addToTimeline(timeline, line, state) {
   const timestamp = line.match(/^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/)[0];
   const isUserEvent = state.includes("User Added") || state.includes("User Switching") || state.includes("User Switch Reported");
   timeline.push({
      timestamp,
      line,
      state,
      isUserEvent
   });
}

function displayTimeline(timeline) {
   const container = document.getElementById('stateTimeline');
   container.innerHTML = timeline.map((entry, index) =>
      `<li class="timeline-item ${entry.isUserEvent ? 'user-event' : ''}" onclick="highlightLog(${index})">
            <div class="timeline-timestamp">${entry.timestamp}</div>
            <div class="timeline-state">${entry.state}</div>
            <code class="timeline-log">${entry.line}</code>
        </li>`
   ).join('');
}

function highlightLog(timelineIndex) {
   const lines = fileContent.split('\n');
   const logContainer = document.getElementById('dlcOutput');
   const logs = Array.from(logContainer.children);
   const timelineEntry = document.getElementById('stateTimeline').children[timelineIndex];
   const logLine = timelineEntry.querySelector('.timeline-log').textContent;
   let matchedElement = null;
   logs.forEach((logElement, index) => {
      if (logElement.textContent.includes(logLine)) {
         matchedElement = logElement;
      }
   });
   if (matchedElement) {
      logs.forEach(log => log.style.border = '');
      matchedElement.style.border = '2px solid red';
      matchedElement.scrollIntoView({
         behavior: 'smooth',
         block: 'center'
      });
      const lineIndex = parseInt(matchedElement.getAttribute('data-line-index'));
      if (!isNaN(lineIndex)) {
         showContext(lineIndex);
      }
   } else {
      alert('Log line not found in the filtered logs.');
   }
}

function updateKioskStatus(kioskInstallationStatus, packageName, installationStatus, buildFingerprint) {
   const kioskDiv = document.getElementById('kioskStatus');
   kioskDiv.innerHTML = `
                                                    <p><strong>Device Build Fingerprint:</strong> ${buildFingerprint || "UNKNOWN"}</p>
                                                    <p><strong>Kiosk App Installation Status:</strong> ${kioskInstallationStatus || "UNKNOWN"}</p>
                                                    <p><strong>Package Name:</strong> ${packageName || "UNKNOWN"}</p>
                                                    <p><strong>Play Installation Status:</strong> ${installationStatus || "UNKNOWN"}</p>
                                                `;
   kioskDiv.className = "";
}

function updateDeviceStatus(lastProvisionState, installationStatus, ineligibleCountryDetected) {
   const statusBox = document.getElementById('deviceStatusBox');
   const statusDiv = document.getElementById('deviceStatus');
   let statusMessage = "";
   let statusClass = "";
   if (ineligibleCountryDetected) {
      statusMessage = "FAILED - INELIGIBLE COUNTRY";
      statusClass = "status-failed";
   } 
   else if (lastProvisionState === 4) {
      statusMessage += "SUCCEEDED";
      statusClass = "status-success";
   } else if (lastProvisionState === 5 || (installationStatus && installationStatus !== "SUCCESS" && installationStatus !== "ALREADY_UP_TO_DATE")) {
      statusMessage += "FAILED";
      statusClass = "status-failed";
   } else {
      statusMessage += "UNKNOWN";
      statusClass = "status-unknown";
   }
   statusDiv.textContent = statusMessage;
   statusBox.className = `status-box ${statusClass}`;
}

function applyColor(line, searchString) {
   const color = searchStrings[searchString];
   return `<span class="highlight" style="background-color:${color};">${line}</span>`;
}

function applyCriticalStyle(line) {
   return `<span class="highlight critical-highlight">${line}</span>`;
}
let activeFilters = Object.keys(searchStrings);

function openFilterSettings() {
   const modal = document.getElementById('filterModal');
   const overlay = document.getElementById('modalOverlay');
   const filterList = document.getElementById('filterList');
   modal.style.width = "400px";
   const sortedFilters = Object.keys(searchStrings).sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
   });
   filterList.innerHTML = sortedFilters
      .map(key => `
            <label style="display: block; margin-bottom: 5px;">
                <input type="checkbox" value="${key}" ${activeFilters.includes(key) ? 'checked' : ''} onchange="updateActiveFilters(this)" />
                ${key}
            </label>
        `).join('');
   modal.style.display = 'block';
   overlay.style.display = 'block';
}

function closeFilterSettings() {
   document.getElementById('filterModal').style.display = 'none';
   document.getElementById('modalOverlay').style.display = 'none';
}

function updateActiveFilters(checkbox) {
   if (checkbox.checked) {
      activeFilters.push(checkbox.value);
   } else {
      activeFilters = activeFilters.filter(filter => filter !== checkbox.value);
   }
   processFile();
}

function showTab(tabId) {
   const tabs = document.querySelectorAll('.tab-content');
   tabs.forEach(tab => {
      tab.style.display = tab.id === tabId ? 'block' : 'none';
   });
}

function addCustomFilter() {
   const input = document.getElementById('customFilterInput');
   const filterValue = input.value.trim();
   if (filterValue && !customFilters.includes(filterValue)) {
      customFilters.push(filterValue);
      const customFilterList = document.getElementById('customFilterList');
      const listItem = document.createElement('li');
      listItem.innerHTML = `
                <label>
                    <input type="checkbox" value="${filterValue}" checked onchange="toggleCustomFilter(this)" />
                    ${filterValue}
                </label>
            `;
      customFilterList.appendChild(listItem);
      input.value = '';
      processFile();
   }
}

function toggleCustomFilter(checkbox) {
   const filterValue = checkbox.value;
   if (checkbox.checked) {
      if (!customFilters.includes(filterValue)) {
         customFilters.push(filterValue);
      }
   } else {
      customFilters = customFilters.filter(filter => filter !== filterValue);
   }
   processFile();
}

function copyToClipboard() {
   const text = document.getElementById('dlcOutput').innerText;
   navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!')).catch(err => alert('Failed to copy: ', err));
}

function enableRoleHolderButton() {
   const roleHolderBtn = document.getElementById('roleHolderButton');
   roleHolderBtn.disabled = false;
   roleHolderBtn.classList.add("enabled");
}

function openRoleHolderInfo() {
   const modal = document.getElementById('roleHolderModal');
   const overlay = document.getElementById('roleHolderOverlay');
   modal.style.display = 'block';
   overlay.style.display = 'block';
}

function closeRoleHolderInfo() {
   document.getElementById('roleHolderModal').style.display = 'none';
   document.getElementById('roleHolderOverlay').style.display = 'none';
}

function updateDLCImplementationStatus(fileContent) {
   const dlcImplementationDetails = document.getElementById('dlcImplementationDetails');
   const roleDumpStart = fileContent.indexOf("DUMP OF SERVICE role:");
   if (roleDumpStart === -1) {
      dlcImplementationDetails.innerHTML = "<p style='color: red;'>Role data not found in the log.</p>";
      return;
   }
   const roleData = fileContent.substring(roleDumpStart);
   const userSections = [...roleData.matchAll(/user_id=(\d+)[\s\S]*?roles=\[([\s\S]*?)\]/g)];
   if (userSections.length === 0) {
      dlcImplementationDetails.innerHTML = "<p style='color: red;'>No user role data found.</p>";
      return;
   }
   let parsedData = "";
   userSections.forEach(userMatch => {
      const userId = userMatch[1].trim();
      const rolesBlock = userMatch[2].trim();
      const targetRoles = {
         "android.app.role.FINANCED_DEVICE_KIOSK": "Holder not assigned",
         "android.app.role.SYSTEM_FINANCED_DEVICE_CONTROLLER": "Holder not assigned"
      };
      const roleMatches = [...rolesBlock.matchAll(/{\s*name=([\w.]+)(?:\s+\w+=\w+)*\s*(?:holders=([\w.]+))?\s*}/g)];
      roleMatches.forEach(match => {
         const roleName = match[1]?.trim();
         const roleHolder = match[2]?.trim() || "Holder not assigned";
         if (roleName in targetRoles) {
            targetRoles[roleName] = roleHolder;
         }
      });
      parsedData += `
            <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                <p style="font-weight: bold; color: #007bff;">User ID: ${userId}</p>
                <p><strong>Financed Device Kiosk:</strong> ${formatHolder(targetRoles["android.app.role.FINANCED_DEVICE_KIOSK"])}</p>
                <p><strong>System Financed Device Controller:</strong> ${formatHolder(targetRoles["android.app.role.SYSTEM_FINANCED_DEVICE_CONTROLLER"])}</p>
            </div>
        `;
   });
   dlcImplementationDetails.innerHTML = parsedData;
}

function formatHolder(holder) {
   return holder === "Holder not assigned" ?
      `<span style="color: red; font-weight: bold;">${holder}</span>` :
      holder;
}
