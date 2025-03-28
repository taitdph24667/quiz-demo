const isMobile = () => {
    if (typeof window !== "undefined") {
      const isSmallScreen = window.innerWidth < 675;
      const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      return isSmallScreen || isMobileDevice;
    }
    return false;
  };
  
  export default isMobile;