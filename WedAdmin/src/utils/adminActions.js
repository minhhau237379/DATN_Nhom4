export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "auto" });
};

export const reloadCurrentPage = () => {
  window.location.reload();
};
