window.addEventListener('load', () => {
    function updateSubmitBtn(){
        if (username.value && gameRoom.value) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    function updateOptions(selectedOption) {
        selectedOption.querySelectorAll('input').forEach((ele) => ele.checked = true);
        selectedOption.parentElement.querySelectorAll('div').forEach((ele) => ele.classList.remove('selected'));
        selectedOption.classList.add('selected');
    }

    const submitBtn = document.querySelector("button.submitBtn");
    const username = document.querySelector('input[name="username"]');
    const gameRoom = document.getElementById('game-room');
    
    document.getElementById('new-game-1v1').addEventListener('click', function() {
        updateOptions(this);
        submitBtn.textContent = 'Start Game';
        gameRoom.removeAttribute('disabled');
    });

    document.getElementById('new-game-2v2').addEventListener('click', function() {
        updateOptions(this);
        submitBtn.textContent = 'Start Game';
        gameRoom.removeAttribute('disabled');
    });

    document.getElementById('existing-game').addEventListener('click', function() {
        updateOptions(this);
        submitBtn.textContent = 'Join Game';
        gameRoom.removeAttribute('disabled');
    });

    username.addEventListener('input', updateSubmitBtn);
    gameRoom.addEventListener('input', updateSubmitBtn);
});
