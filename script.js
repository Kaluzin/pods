function comprar(produto) {
  var numero = "5511947871294";
  var msg = "Olá, tenho interesse no " + produto + ".";
  window.open("https://wa.me/" + numero + "?text=" + encodeURIComponent(msg), "_blank");
}

function toggleMenu() {
  var nav = document.getElementById("mobileNav");
  nav.classList.toggle("open");
}

function toggleFaq(btn) {
  var answer = btn.nextElementSibling;
  var icon = btn.querySelector(".faq-icon");
  var isOpen = answer.classList.contains("open");
  document.querySelectorAll(".faq-answer.open").forEach(function(a) {
    a.classList.remove("open");
  });
  document.querySelectorAll(".faq-icon").forEach(function(i) {
    i.textContent = "+";
  });
  if (!isOpen) {
    answer.classList.add("open");
    icon.textContent = "−";
  }
}

function subscribeNewsletter(e) {
  e.preventDefault();
  alert("Cadastro realizado com sucesso! Em breve você receberá nossas novidades.");
  e.target.reset();
}

document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
  anchor.addEventListener("click", function(e) {
    var target = document.querySelector(this.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});
