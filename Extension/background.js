const API_URL = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {  
  if (request.action === 'saveText') {
    saveTextToBackend(request.data)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Save error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }
  
  if (request.action === 'queryChat') {
    queryChatbot(request.query)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Query error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }
  
  if (request.action === 'getSavedTexts') {
    getSavedTexts()
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Get texts error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }
  
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

async function saveTextToBackend(data) {
  try {
    const response = await fetch(`${API_URL}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(' Text saved successfully');
    return result;
  } catch (error) {
    console.error(' Error saving text:', error);
    throw new Error('Failed to save text. Is the backend server running?');
  }
}

async function queryChatbot(query) {
  try {
    const response = await fetch(`${API_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(' Query successful');
    return result;
  } catch (error) {
    console.error(' Error querying chatbot:', error);
    throw new Error('Failed to query chatbot. Is the backend server running?');
  }
}

async function getSavedTexts() {
  try {
    const response = await fetch(`${API_URL}/api/texts`);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`Retrieved ${result.texts?.length || 0} saved texts`);
    return result;
  } catch (error) {
    console.error(' Error fetching texts:', error);
    throw new Error('Failed to fetch saved texts. Is the backend server running?');
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveSelectedText',
    title: ' Save selected text',
    contexts: ['selection']
  });
  
  console.log('Smart Text Saver extension installed');
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveSelectedText' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'getPageInfo'
    }, (response) => {
      const data = {
        text: info.selectionText,
        url: tab.url || 'Unknown',
        title: tab.title || 'Untitled',
        timestamp: new Date().toISOString()
      };
      
      saveTextToBackend(data)
        .then(() => {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Text Saved',
            message: 'Selected text has been saved successfully!'
          });
        })
        .catch(error => {
          console.error('Failed to save from context menu:', error);
        });
    });
  }
});

async function checkServerConnection() {
  try {
    const response = await fetch(`${API_URL}/`);
    if (response.ok) {
      console.log(' Backend server is running');
    }
  } catch (error) {
    console.warn(' Backend server is not running. Please start it with: npm start');
  }
}

checkServerConnection();