# DLC InsightLab - Smart Log Analysis for Android DLC

DLC InsightLab is a web-based log filtering and analysis tool designed for Android **DLC** logs. It provides a **structured, insightful, and efficient** way to analyze log data, helping developers, testers, and support engineers debug DLC implementations and issues effectively.

## Getting Started

- Clone the repository and open it in a browser:
  ```sh
  git clone https://github.com/google/dlc-insight-lab.git
  cd dlc-insight-lab
  ```
  Open `index.html` in a web browser.

## Features

DLC InsightLab provides the following capabilities:

1. **Log File Support** - Supports `.txt`, `.log`, and `.zip` (android bugreport) formats.
2. **Smart Filtering** - Highlights critical log entries using predefined and custom DLC filters.
3. **Timeline View** - Displays key state transitions in an interactive timeline.
4. **Gemini Powered Insights** - Uses Google Gemini to summarize logs and highlight key events.
5. **Search & Contextual Logs** - Locate relevant logs and view contextual details.
6. **Copy & Export** - Copy filtered logs for debugging and reporting purposes.

## Installation

### Prerequisites

- A valid Gemini API key is required to enable **Gemini powered analysis** functionality.
- Add your API key in `script.js`:
  ```js
  const apiKey = "your-api-key-here";
  ```

## Usage

1. **Upload Logs** - Click 'Upload Log File' to upload `.txt`, `.log`, or `.zip` log files. You can also upload an Android bugreport.
2. **Process Logs** - Click 'Process Logs' to analyze log entries.
3. **Apply Filters** - Use the 'Filters' menu to manage predefined and custom filters.
4. **View Insights** - Click 'Show Insights' to generate Gemini-powered log summaries. Ensure the API key is set for Gemini-powered features.
5. **Timeline & Contextual Logs** - Logs are structured in a timeline format for easier debugging.

## Support

If you've found an error in this sample, please file an issue:
https://github.com/google/dlc-insight-lab/issues  
Patches are encouraged, and may be submitted by forking this project and
submitting a pull request through GitHub.

## License

The code is published under Apache License 2.0. See LICENSE.md for details

## How to make contributions?

Please read and follow the steps in the CONTRIBUTING.md file.

## Disclaimer

This is not an official Google project. If you plan to incorporate the features
demonstrated, please carefully review the code and proceed at your own risk. 
