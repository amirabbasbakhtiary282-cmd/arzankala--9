  document.addEventListener('DOMContentLoaded', function () {
    let menuCollapse = document.getElementById('hmNavbarCollapse');
    if (!menuCollapse) return;
    let menuLinks = menuCollapse.querySelectorAll('.nav-link');
    menuLinks.forEach(function(link) {
      link.addEventListener('click', function () {
        let bsCollapse = bootstrap.Collapse.getInstance(menuCollapse);
        if (bsCollapse) bsCollapse.hide();
      });
    });
  });
