const btn = document.getElementById("toggleExteraBtn");
const extra = document.querySelector(".extra");

if(btn && extra) {
    btn.addEventListener("click", function () {
        extra.classList.toggle("show");
        btn.textContent = extra.classList.contains("show") ? "نمایش کمتر" : "نمایش بیشتر";
    });
}

const filterButtons = document.querySelectorAll(".btn-outline-secondary");
const products = document.querySelectorAll(".product");
const productRow = document.querySelector(".product-row");

filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const category = btn.textContent.trim();

        products.forEach(product => {
            if(category === "همه") {
                product.classList.remove("hide");
            }
            else if(category === "سیپی کالاف") {
                product.classList.toggle("hide", !product.classList.contains("cp2"));
            }
            else if(category === "یوسی پابجی") {
                product.classList.toggle("hide", !product.classList.contains("pubg"));
            }
            else if(category === "جم فری فایر") {
                product.classList.toggle("hide", !product.classList.contains("freefire"));
            }
            else if(category === "جم کلش آف کلنز") {
                product.classList.toggle("hide", !product.classList.contains("coc"));
            }
            else if(category === "جم کلش رویال") {
                product.classList.toggle("hide", !product.classList.contains("royale"));
            }
        });

        const visibleCount = [...products].filter(p => !p.classList.contains("hide")).length;

        if(productRow) {
            if (visibleCount > 0 && category !== "همه") {
                productRow.classList.remove("justify-content-center");
                productRow.classList.add("justify-content-start");
            } else {
                productRow.classList.remove("justify-content-start");
                productRow.classList.add("justify-content-center");
            }
        }
    });
});
