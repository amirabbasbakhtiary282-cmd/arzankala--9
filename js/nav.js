  document.addEventListener('DOMContentLoaded', function () {
    var menuLinks = document.querySelectorAll('#myMenu .nav-link');
    var menuCollapse = document.getElementById('myMenu');

    menuLinks.forEach(function(link) {
      link.addEventListener('click', function () {
        var bsCollapse = new bootstrap.Collapse(menuCollapse, {toggle:false});
        bsCollapse.hide();
      });
    });
  });
