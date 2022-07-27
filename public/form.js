window.addEventListener('load', () => {
    function updateSubmitBtn(){
        if (username.value && gameRoom.value) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    function updateOptions(selectedOption, submitBtnText) {
        selectedOption.querySelectorAll('input').forEach((ele) => ele.checked = true);
        selectedOption.parentElement.querySelectorAll('div').forEach((ele) => ele.classList.remove('selected'));
        selectedOption.classList.add('selected');
        submitBtn.textContent = submitBtnText;
        gameRoom.removeAttribute('disabled');
    }

    const submitBtn = document.querySelector("button.submitBtn");
    submitBtn.tabIndex = 0;
    const username = document.querySelector('input[name="username"]');
    const gameRoom = document.getElementById('game-room');
    
    let newGame1v1 = document.getElementById('new-game-1v1');
    newGame1v1.tabIndex = 0;
    newGame1v1.addEventListener('click', function() {
        updateOptions(this, 'Start Game');
    });
    newGame1v1.addEventListener('keydown', (event) => {
        if (event.code === 'Enter') {
            newGame1v1.click();
        }
    });
    
    let newGame2v2 = document.getElementById('new-game-2v2')
    newGame2v2.tabIndex = 0;
    newGame2v2.addEventListener('click', function() {
        updateOptions(this, 'Start Game');
    });
    newGame2v2.addEventListener('keydown', (event) => {
        if (event.code === 'Enter') {
            newGame2v2.click();
        }
    });

    let existingGame = document.getElementById('existing-game');
    existingGame.tabIndex = 0;
    existingGame.addEventListener('click', function() {
        updateOptions(this, 'Join Game');
    });
    existingGame.addEventListener('keydown', (event) => {
        if (event.code === 'Enter') {
            existingGame.click();
        }
    });

    username.addEventListener('input', updateSubmitBtn);
    gameRoom.addEventListener('input', updateSubmitBtn);
});
