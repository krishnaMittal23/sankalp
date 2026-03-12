let saveButton = null;

function createSaveButton() {
  console.log('Attempting to create save button...');
  if (saveButton) {
    console.log('Button already exists, returning existing instance.');
    return saveButton;
  }
  
  saveButton = document.createElement('div');
  saveButton.id = 'smart-text-saver-btn';
  saveButton.innerHTML = ' Save';
  saveButton.style.cssText = `
    position: absolute;
    display: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    z-index: 10000;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  saveButton.addEventListener('mouseenter', () => {
    saveButton.style.transform = 'translateY(-2px)';
    saveButton.style.box-shadow = '0 6px 16px rgba(0,0,0,0.2)';
  });
  
  saveButton.addEventListener('mouseleave', () => {
    saveButton.style.transform = 'translateY(0)';
    saveButton.style.box-shadow = '0 4px 12px rgba(0,0,0,0.15)';
  });
  
  saveButton.addEventListener('click', handleSaveClick);
  document.body.appendChild(saveButton);
  console.log('Save button created and appended to body.');
  return saveButton;
}

function handleSaveClick() {
  console.log('Save button clicked!');
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  console.log('Selected text:', selectedText);
  
  if (selectedText) {
    const url = window.location.href;
    const title = document.title;
    console.log('URL:', url, 'Title:', title);
    
    saveButton.innerHTML = '⏳ Saving...';
    saveButton.style.pointerEvents = 'none';
    
    console.log('Sending message to background script...');
    chrome.runtime.sendMessage({
      action: 'saveText',
      data: {
        text: selectedText,
        url: url,
        title: title,
        timestamp: new Date().toISOString()
      }
    }, (response) => {
      console.log('Received response from background script:', response);
      if (response && response.success) {
        console.log('Save successful!');
        saveButton.innerHTML = '✓ Saved!';
        saveButton.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        setTimeout(() => {
          saveButton.style.display = 'none';
          saveButton.innerHTML = '💾 Save';
          saveButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          saveButton.style.pointerEvents = 'auto';
          console.log('Button reset after success.');
        }, 2000);
      } else {
        console.error('Save failed!', response);
        saveButton.innerHTML = '❌ Error';
        saveButton.style.background = 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
        setTimeout(() => {
          saveButton.style.display = 'none';
          saveButton.innerHTML = '💾 Save';
          saveButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          saveButton.style.pointerEvents = 'auto';
          console.log('Button reset after error.');
        }, 2000);
      }
    });
  } else {
    console.warn('No text selected, handleSaveClick aborted.');
  }
}

document.addEventListener('mouseup', (e) => {
  console.log('Mouse up event detected.');
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    console.log('Selected text on mouse up:', selectedText);
    
    if (selectedText.length > 0) {
      const btn = createSaveButton();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      btn.style.display = 'block';
      btn.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 50}px`;
      btn.style.top = `${rect.top + window.scrollY - 45}px`;
      console.log(`Button positioned at left: ${btn.style.left}, top: ${btn.style.top}`);
    } else {
      if (saveButton) {
        saveButton.style.display = 'none';
        console.log('No text selected, hiding button.');
      }
    }
  }, 10);
});

document.addEventListener('mousedown', (e) => {
  console.log('Mouse down event detected.');
  if (saveButton && e.target !== saveButton && !saveButton.contains(e.target)) {
    console.log('Click was outside the save button.');
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection.toString().trim()) {
        saveButton.style.display = 'none';
        console.log('No selection after click outside, hiding button.');
      }
    }, 10);
  }
});