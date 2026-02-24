function comprar(produto){
let numero="5511947871297";
let msg=`Olá, tenho interesse no ${produto}.`;
window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`,"_blank");
}