
window.changeTheme = function(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('appTheme', themeName);
};
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('appTheme') || 'legacy';
    document.body.setAttribute('data-theme', savedTheme);
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.value = savedTheme;
    }
});
