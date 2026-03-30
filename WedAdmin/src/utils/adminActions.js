export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "auto" });
};

export const reloadCurrentPage = () => {
  scrollToTop();
  window.location.reload();
};
