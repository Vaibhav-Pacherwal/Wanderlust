(() => {
  'use strict'

  const forms = document.querySelectorAll('.needs-validation')

  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

let taxSwitch = document.getElementById("switchCheckDefault");
taxSwitch.addEventListener("click", ()=>{
  let tax = document.querySelectorAll(".taxation");
  for(let info of tax) {
    if(info.style.display !== "inline") {
      info.style.display = "inline";
    } else {
      info.style.display = "none";
    }
  }
});