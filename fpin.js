function moveToNextInput(event, nextInputName) {
    const input = event.target;
    if (input.value.length === input.maxLength) {
      const nextInput = document.querySelector(`input[name=${nextInputName}]`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  function handleBackspace(event, prevInputName) {
    const input = event.target;
    if (event.key === 'Backspace' && input.value.length === 0) {
      const prevInput = document.querySelector(`input[name=${prevInputName}]`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  }