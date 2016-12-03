var Utils = {
  capString: function(str){
      if(str.substring && str.length){
          str = str.substring(0, 1).toUpperCase() + str.substring(1);
      }
      return str;
  }  
};
