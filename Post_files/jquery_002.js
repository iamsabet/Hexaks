(function(factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($, window, document, undefined) {

  "use strict";

  var pluginName = "ccPicker";
  var defaults = {
    countryCode: "IR",
    dialCodeFieldName: "phoneCode",
    dataUrl: "../Statics/javascripts/countries.json",
	countryFilter: true,
    searchPlaceHolder: "Search"
  };


  function CcPicker(element, options) {
	var self = this;
    this.element = element;
    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this._list = {};
	this._filter = {};
    this._ccData = {};
    this._ccPicker = {};
    this._ccDialCodeTrackerField = {};
	this._ccSelectedCountry = {};
    this.init();

    function setCountryByPhoneCode(code) {
      var cc = self.findCountryByPhoneCode(self, code);
      self._ccPicker.html(self.createCountryListItem(cc.code, cc.phoneCode));
	  self._ccDialCodeTrackerField.val(cc.phoneCode);
	  self._ccSelectedCountry = {code: cc.code, phoneCode: cc.phoneCode};
	  $(self.element).trigger("countrySelect", cc);
    }

    function setCountryByCode(code) {
      var cc = self.findCountryByCountryCode(self, code);
      self._ccPicker.html(self.createCountryListItem(cc.code, cc.phoneCode));
	  self._ccDialCodeTrackerField.val(cc.phoneCode);
	  self._ccSelectedCountry = {code: cc.code, phoneCode: cc.phoneCode};
	  $(self.element).trigger("countrySelect", cc);
    }

   function disable() {
      $(self.element).prop('disabled', true);
      self._ccPicker.off("click");
      self._ccPicker.css("cursor", "default");
    }

    function enable() {
      $(self.element).prop('disabled', false);
      self._ccPicker.off("click");
      self._ccPicker.on("click", function (e) {
        $.isEmptyObject(self._list) ? self.createCountryList(self) : self.destroyCountryList(self);
        e.stopPropagation();
      });
      self._ccPicker.css("cursor", "pointer");
    }

    return {
      setCountryByPhoneCode: setCountryByPhoneCode,
      setCountryByCode: setCountryByCode,
      disable: disable,
      enable: enable
    };
  }

  $.extend(CcPicker.prototype, {
    init: function () {
      let c = this;
      this.loadCountryData(c);
      let cc = this.findCountryByCountryCode(c, this.options.countryCode);
      this._ccPicker = $('<div class="cc-picker cc-picker-code-select-enabled">').insertBefore(this.element);
      this._ccDialCodeTrackerField = $('<input>').attr({
        type: 'hidden',
        id: this.element.id + "_" + this.options.dialCodeFieldName,
        name: this.element.name + "_" + this.options.dialCodeFieldName,
        value: cc.phoneCode
      }).insertBefore(this.element);
      this._ccPicker.prepend(this.createCountryListItem(this.options.countryCode.toLowerCase(), cc.phoneCode));
	  this._ccSelectedCountry = {code: this.options.countryCode.toLowerCase(), phoneCode: cc.phoneCode};
      this._ccPicker.on("click", function (e) {
        $.isEmptyObject(c._list) ? c.createCountryList(c) : c.destroyCountryList(c);
	e.stopPropagation();
      });
	$("body").on("click", function () {
        if (!$.isEmptyObject(c._list)) {
          c.destroyCountryList(c);
        }
      });
    },
    loadCountryData: function (e) {
          e._ccData = countries;
    },
    findCountryByPhoneCode: function (e, code) {
      return $.grep(e._ccData, function (o) {
        return o.phoneCode.toUpperCase() === code.toUpperCase();
      })[0];
    },
    findCountryByCountryCode: function (e, code) {
      return $.grep(e._ccData, function (o) {
        return o.code.toUpperCase() === code.toUpperCase();
      })[0];
    },
    createCountryList: function (e) {
      var zIndex = e._ccPicker.css("z-index") === "auto" ? 0 : Number(e._ccPicker.css("z-index")) + 10;
      e._list = $("<ul/>", {"class": "cc-picker-code-list"}).appendTo(".phone .list");
      e._list.css({
        top: 40,
        left: 0,
        "z-index": zIndex
      });
      $.each(e._ccData, function (key, val) {
        var l = $("<li>", {text: val.countryName}).appendTo(e._list);
        $(l).data("countryItem", val);
        $(l).prepend(e.createCountryListItem(val.code, val.phoneCode));
        $(l).on("click", function () {
          e.selectCountry(e, $(this));
          e.destroyCountryList(e);
        });
		if(val.phoneCode === e._ccSelectedCountry.phoneCode){
			$(l).addClass("cc-picker-selected-country");
		}
      });
	  if (e.options.countryFilter) {
        e._filter = $("<input/>", {"class": "cc-picker-code-filter","id":"searchCountry", "placeholder": e.options.searchPlaceHolder}).insertBefore(e._list);
        e._filter.css({
          top: 0,
          left: 0,
          "z-index": zIndex
        });
        $("#searchCountry").focus();
        e._filter.on("click", function (e) {
          e.stopPropagation();
        });
        e._filter.on("keyup", function (e) {
          var text = $(this).val();
          $('.cc-picker-code-list li:not(:ccContains("' + text + '"))').hide();
          $('.cc-picker-code-list li:ccContains("' + text + '")').show();
         
        });
      }
    },
    destroyCountryList: function (e) {
      e._list.remove();
      e._list = {};

	  if (e.options.countryFilter) {
        e._filter.remove();
        e._filter = {};
      }
    },
    selectCountry: function (e, c) {
      var i = $(c).data("countryItem");
    this._ccSelectedCountry = i;
      e._ccPicker.html(e.createCountryListItem(i.code, i.phoneCode));
      e._ccDialCodeTrackerField.val(i.phoneCode, i.code, i.phoneCode);
	  $(e.element).trigger("countrySelect", i);
    },
    createCountryListItem: function (countryCode, dialCode) {
      return '<div class="cc-picker-flag ' + countryCode.toLowerCase() + '"></div><span class="cc-picker-code">' + dialCode + '</span> ';
    }
  });

   $.extend($.expr[":"], {
    ccContains: function (a, i, m) {
      return $(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
    }
  });

  $.fn.CcPicker = function (options) {
    if (typeof arguments[0] === 'string') {
      var methodName = arguments[0];
      var args = Array.prototype.slice.call(arguments, 1);
      var returnVal;
      this.each(function () {
        if ($.data(this, 'plugin_' + pluginName) && typeof $.data(this, 'plugin_' + pluginName)[methodName] === 'function') {
          returnVal = $.data(this, 'plugin_' + pluginName)[methodName].apply(this, args);
        } else {
          throw new Error('Method ' + methodName + ' does not exist on jQuery.' + pluginName);
        }
      });
      if (returnVal !== undefined) {
        return returnVal;
      } else {
        return this;
      }
    } else if (typeof options === "object" || !options) {
      return this.each(function () {
        if (!$.data(this, 'plugin_' + pluginName)) {
          $.data(this, 'plugin_' + pluginName, new CcPicker(this, options));
        }
      });
    }
  };

}));


let countries = [
	{
		"countryName": "Aruba",
		"code": "AW",
		"phoneCode": "297"
	},
	{
		"countryName": "Afghanistan",
		"code": "AF",
		"phoneCode": "93"
	},
	{
		"countryName": "Angola",
		"code": "AO",
		"phoneCode": "244"
	},
	{
		"countryName": "Anguilla",
		"code": "AI",
		"phoneCode": "1264"
	},
	{
		"countryName": "Ã…land Islands",
		"code": "AX",
		"phoneCode": "358"
	},
	{
		"countryName": "Albania",
		"code": "AL",
		"phoneCode": "355"
	},
	{
		"countryName": "Andorra",
		"code": "AD",
		"phoneCode": "376"
	},
	{
		"countryName": "United Arab Emirates",
		"code": "AE",
		"phoneCode": "971"
	},
	{
		"countryName": "Argentina",
		"code": "AR",
		"phoneCode": "54"
	},
	{
		"countryName": "Armenia",
		"code": "AM",
		"phoneCode": "374"
	},
	{
		"countryName": "American Samoa",
		"code": "AS",
		"phoneCode": "1684"
	},
	{
		"countryName": "Antigua and Barbuda",
		"code": "AG",
		"phoneCode": "1268"
	},
	{
		"countryName": "Australia",
		"code": "AU",
		"phoneCode": "61"
	},
	{
		"countryName": "Austria",
		"code": "AT",
		"phoneCode": "43"
	},
	{
		"countryName": "Azerbaijan",
		"code": "AZ",
		"phoneCode": "994"
	},
	{
		"countryName": "Burundi",
		"code": "BI",
		"phoneCode": "257"
	},
	{
		"countryName": "Belgium",
		"code": "BE",
		"phoneCode": "32"
	},
	{
		"countryName": "Benin",
		"code": "BJ",
		"phoneCode": "229"
	},
	{
		"countryName": "Burkina Faso",
		"code": "BF",
		"phoneCode": "226"
	},
	{
		"countryName": "Bangladesh",
		"code": "BD",
		"phoneCode": "880"
	},
	{
		"countryName": "Bulgaria",
		"code": "BG",
		"phoneCode": "359"
	},
	{
		"countryName": "Bahrain",
		"code": "BH",
		"phoneCode": "973"
	},
	{
		"countryName": "Bahamas",
		"code": "BS",
		"phoneCode": "1242"
	},
	{
		"countryName": "Bosnia and Herzegovina",
		"code": "BA",
		"phoneCode": "387"
	},
	{
		"countryName": "Saint BarthÃ©lemy",
		"code": "BL",
		"phoneCode": "590"
	},
	{
		"countryName": "Belarus",
		"code": "BY",
		"phoneCode": "375"
	},
	{
		"countryName": "Belize",
		"code": "BZ",
		"phoneCode": "501"
	},
	{
		"countryName": "Bermuda",
		"code": "BM",
		"phoneCode": "1441"
	},
	{
		"countryName": "Bolivia",
		"code": "BO",
		"phoneCode": "591"
	},
	{
		"countryName": "Brazil",
		"code": "BR",
		"phoneCode": "55"
	},
	{
		"countryName": "Barbados",
		"code": "BB",
		"phoneCode": "1246"
	},
	{
		"countryName": "Brunei",
		"code": "BN",
		"phoneCode": "673"
	},
	{
		"countryName": "Bhutan",
		"code": "BT",
		"phoneCode": "975"
	},
	{
		"countryName": "Botswana",
		"code": "BW",
		"phoneCode": "267"
	},
	{
		"countryName": "Central African Republic",
		"code": "CF",
		"phoneCode": "236"
	},
	{
		"countryName": "Canada",
		"code": "CA",
		"phoneCode": "1"
	},
	{
		"countryName": "Cocos (Keeling) Islands",
		"code": "CC",
		"phoneCode": "61"
	},
	{
		"countryName": "Switzerland",
		"code": "CH",
		"phoneCode": "41"
	},
	{
		"countryName": "Chile",
		"code": "CL",
		"phoneCode": "56"
	},
	{
		"countryName": "China",
		"code": "CN",
		"phoneCode": "86"
	},
	{
		"countryName": "Ivory Coast",
		"code": "CI",
		"phoneCode": "225"
	},
	{
		"countryName": "Cameroon",
		"code": "CM",
		"phoneCode": "237"
	},
	{
		"countryName": "DR Congo",
		"code": "CD",
		"phoneCode": "243"
	},
	{
		"countryName": "Republic of the Congo",
		"code": "CG",
		"phoneCode": "242"
	},
	{
		"countryName": "Cook Islands",
		"code": "CK",
		"phoneCode": "682"
	},
	{
		"countryName": "Colombia",
		"code": "CO",
		"phoneCode": "57"
	},
	{
		"countryName": "Comoros",
		"code": "KM",
		"phoneCode": "269"
	},
	{
		"countryName": "Cape Verde",
		"code": "CV",
		"phoneCode": "238"
	},
	{
		"countryName": "Costa Rica",
		"code": "CR",
		"phoneCode": "506"
	},
	{
		"countryName": "Cuba",
		"code": "CU",
		"phoneCode": "53"
	},
	{
		"countryName": "CuraÃ§ao",
		"code": "CW",
		"phoneCode": "5999"
	},
	{
		"countryName": "Christmas Island",
		"code": "CX",
		"phoneCode": "61"
	},
	{
		"countryName": "Cayman Islands",
		"code": "KY",
		"phoneCode": "1345"
	},
	{
		"countryName": "Cyprus",
		"code": "CY",
		"phoneCode": "357"
	},
	{
		"countryName": "Czechia",
		"code": "CZ",
		"phoneCode": "420"
	},
	{
		"countryName": "Germany",
		"code": "DE",
		"phoneCode": "49"
	},
	{
		"countryName": "Djibouti",
		"code": "DJ",
		"phoneCode": "253"
	},
	{
		"countryName": "Dominica",
		"code": "DM",
		"phoneCode": "1767"
	},
	{
		"countryName": "Denmark",
		"code": "DK",
		"phoneCode": "45"
	},
	{
		"countryName": "Dominican Republic",
		"code": "DO",
		"phoneCode": "1809"
	},
	{
		"countryName": "Dominican Republic",
		"code": "DO",
		"phoneCode": "1829"
	},
	{
		"countryName": "Dominican Republic",
		"code": "DO",
		"phoneCode": "1849"
	},
	{
		"countryName": "Algeria",
		"code": "DZ",
		"phoneCode": "213"
	},
	{
		"countryName": "Ecuador",
		"code": "EC",
		"phoneCode": "593"
	},
	{
		"countryName": "Egypt",
		"code": "EG",
		"phoneCode": "20"
	},
	{
		"countryName": "Eritrea",
		"code": "ER",
		"phoneCode": "291"
	},
	{
		"countryName": "Western Sahara",
		"code": "EH",
		"phoneCode": "212"
	},
	{
		"countryName": "Spain",
		"code": "ES",
		"phoneCode": "34"
	},
	{
		"countryName": "Estonia",
		"code": "EE",
		"phoneCode": "372"
	},
	{
		"countryName": "Ethiopia",
		"code": "ET",
		"phoneCode": "251"
	},
	{
		"countryName": "Finland",
		"code": "FI",
		"phoneCode": "358"
	},
	{
		"countryName": "Fiji",
		"code": "FJ",
		"phoneCode": "679"
	},
	{
		"countryName": "Falkland Islands",
		"code": "FK",
		"phoneCode": "500"
	},
	{
		"countryName": "France",
		"code": "FR",
		"phoneCode": "33"
	},
	{
		"countryName": "Faroe Islands",
		"code": "FO",
		"phoneCode": "298"
	},
	{
		"countryName": "Micronesia",
		"code": "FM",
		"phoneCode": "691"
	},
	{
		"countryName": "Gabon",
		"code": "GA",
		"phoneCode": "241"
	},
	{
		"countryName": "United Kingdom",
		"code": "GB",
		"phoneCode": "44"
	},
	{
		"countryName": "Georgia",
		"code": "GE",
		"phoneCode": "995"
	},
	{
		"countryName": "Guernsey",
		"code": "GG",
		"phoneCode": "44"
	},
	{
		"countryName": "Ghana",
		"code": "GH",
		"phoneCode": "233"
	},
	{
		"countryName": "Gibraltar",
		"code": "GI",
		"phoneCode": "350"
	},
	{
		"countryName": "Guinea",
		"code": "GN",
		"phoneCode": "224"
	},
	{
		"countryName": "Guadeloupe",
		"code": "GP",
		"phoneCode": "590"
	},
	{
		"countryName": "Gambia",
		"code": "GM",
		"phoneCode": "220"
	},
	{
		"countryName": "Guinea-Bissau",
		"code": "GW",
		"phoneCode": "245"
	},
	{
		"countryName": "Equatorial Guinea",
		"code": "GQ",
		"phoneCode": "240"
	},
	{
		"countryName": "Greece",
		"code": "GR",
		"phoneCode": "30"
	},
	{
		"countryName": "Grenada",
		"code": "GD",
		"phoneCode": "1473"
	},
	{
		"countryName": "Greenland",
		"code": "GL",
		"phoneCode": "299"
	},
	{
		"countryName": "Guatemala",
		"code": "GT",
		"phoneCode": "502"
	},
	{
		"countryName": "French Guiana",
		"code": "GF",
		"phoneCode": "594"
	},
	{
		"countryName": "Guam",
		"code": "GU",
		"phoneCode": "1671"
	},
	{
		"countryName": "Guyana",
		"code": "GY",
		"phoneCode": "592"
	},
	{
		"countryName": "Hong Kong",
		"code": "HK",
		"phoneCode": "852"
	},
	{
		"countryName": "Honduras",
		"code": "HN",
		"phoneCode": "504"
	},
	{
		"countryName": "Croatia",
		"code": "HR",
		"phoneCode": "385"
	},
	{
		"countryName": "Haiti",
		"code": "HT",
		"phoneCode": "509"
	},
	{
		"countryName": "Hungary",
		"code": "HU",
		"phoneCode": "36"
	},
	{
		"countryName": "Indonesia",
		"code": "ID",
		"phoneCode": "62"
	},
	{
		"countryName": "Isle of Man",
		"code": "IM",
		"phoneCode": "44"
	},
	{
		"countryName": "India",
		"code": "IN",
		"phoneCode": "91"
	},
	{
		"countryName": "British Indian Ocean Territory",
		"code": "IO",
		"phoneCode": "246"
	},
	{
		"countryName": "Ireland",
		"code": "IE",
		"phoneCode": "353"
	},
	{
		"countryName": "Iran",
		"code": "IR",
		"phoneCode": "98"
	},
	{
		"countryName": "Iraq",
		"code": "IQ",
		"phoneCode": "964"
	},
	{
		"countryName": "Iceland",
		"code": "IS",
		"phoneCode": "354"
	},
	{
		"countryName": "Israel",
		"code": "IL",
		"phoneCode": "972"
	},
	{
		"countryName": "Italy",
		"code": "IT",
		"phoneCode": "39"
	},
	{
		"countryName": "Jamaica",
		"code": "JM",
		"phoneCode": "1876"
	},
	{
		"countryName": "Jersey",
		"code": "JE",
		"phoneCode": "44"
	},
	{
		"countryName": "Jordan",
		"code": "JO",
		"phoneCode": "962"
	},
	{
		"countryName": "Japan",
		"code": "JP",
		"phoneCode": "81"
	},
	{
		"countryName": "Kazakhstan",
		"code": "KZ",
		"phoneCode": "76"
	},
	{
		"countryName": "Kazakhstan",
		"code": "KZ",
		"phoneCode": "77"
	},
	{
		"countryName": "Kenya",
		"code": "KE",
		"phoneCode": "254"
	},
	{
		"countryName": "Kyrgyzstan",
		"code": "KG",
		"phoneCode": "996"
	},
	{
		"countryName": "Cambodia",
		"code": "KH",
		"phoneCode": "855"
	},
	{
		"countryName": "Kiribati",
		"code": "KI",
		"phoneCode": "686"
	},
	{
		"countryName": "Saint Kitts and Nevis",
		"code": "KN",
		"phoneCode": "1869"
	},
	{
		"countryName": "South Korea",
		"code": "KR",
		"phoneCode": "82"
	},
	{
		"countryName": "Kosovo",
		"code": "XK",
		"phoneCode": "383"
	},
	{
		"countryName": "Kuwait",
		"code": "KW",
		"phoneCode": "965"
	},
	{
		"countryName": "Laos",
		"code": "LA",
		"phoneCode": "856"
	},
	{
		"countryName": "Lebanon",
		"code": "LB",
		"phoneCode": "961"
	},
	{
		"countryName": "Liberia",
		"code": "LR",
		"phoneCode": "231"
	},
	{
		"countryName": "Libya",
		"code": "LY",
		"phoneCode": "218"
	},
	{
		"countryName": "Saint Lucia",
		"code": "LC",
		"phoneCode": "1758"
	},
	{
		"countryName": "Liechtenstein",
		"code": "LI",
		"phoneCode": "423"
	},
	{
		"countryName": "Sri Lanka",
		"code": "LK",
		"phoneCode": "94"
	},
	{
		"countryName": "Lesotho",
		"code": "LS",
		"phoneCode": "266"
	},
	{
		"countryName": "Lithuania",
		"code": "LT",
		"phoneCode": "370"
	},
	{
		"countryName": "Luxembourg",
		"code": "LU",
		"phoneCode": "352"
	},
	{
		"countryName": "Latvia",
		"code": "LV",
		"phoneCode": "371"
	},
	{
		"countryName": "Macau",
		"code": "MO",
		"phoneCode": "853"
	},
	{
		"countryName": "Saint Martin",
		"code": "MF",
		"phoneCode": "590"
	},
	{
		"countryName": "Morocco",
		"code": "MA",
		"phoneCode": "212"
	},
	{
		"countryName": "Monaco",
		"code": "MC",
		"phoneCode": "377"
	},
	{
		"countryName": "Moldova",
		"code": "MD",
		"phoneCode": "373"
	},
	{
		"countryName": "Madagascar",
		"code": "MG",
		"phoneCode": "261"
	},
	{
		"countryName": "Maldives",
		"code": "MV",
		"phoneCode": "960"
	},
	{
		"countryName": "Mexico",
		"code": "MX",
		"phoneCode": "52"
	},
	{
		"countryName": "Marshall Islands",
		"code": "MH",
		"phoneCode": "692"
	},
	{
		"countryName": "Macedonia",
		"code": "MK",
		"phoneCode": "389"
	},
	{
		"countryName": "Mali",
		"code": "ML",
		"phoneCode": "223"
	},
	{
		"countryName": "Malta",
		"code": "MT",
		"phoneCode": "356"
	},
	{
		"countryName": "Myanmar",
		"code": "MM",
		"phoneCode": "95"
	},
	{
		"countryName": "Montenegro",
		"code": "ME",
		"phoneCode": "382"
	},
	{
		"countryName": "Mongolia",
		"code": "MN",
		"phoneCode": "976"
	},
	{
		"countryName": "Northern Mariana Islands",
		"code": "MP",
		"phoneCode": "1670"
	},
	{
		"countryName": "Mozambique",
		"code": "MZ",
		"phoneCode": "258"
	},
	{
		"countryName": "Mauritania",
		"code": "MR",
		"phoneCode": "222"
	},
	{
		"countryName": "Montserrat",
		"code": "MS",
		"phoneCode": "1664"
	},
	{
		"countryName": "Martinique",
		"code": "MQ",
		"phoneCode": "596"
	},
	{
		"countryName": "Mauritius",
		"code": "MU",
		"phoneCode": "230"
	},
	{
		"countryName": "Malawi",
		"code": "MW",
		"phoneCode": "265"
	},
	{
		"countryName": "Malaysia",
		"code": "MY",
		"phoneCode": "60"
	},
	{
		"countryName": "Mayotte",
		"code": "YT",
		"phoneCode": "262"
	},
	{
		"countryName": "Namibia",
		"code": "NA",
		"phoneCode": "264"
	},
	{
		"countryName": "New Caledonia",
		"code": "NC",
		"phoneCode": "687"
	},
	{
		"countryName": "Niger",
		"code": "NE",
		"phoneCode": "227"
	},
	{
		"countryName": "Norfolk Island",
		"code": "NF",
		"phoneCode": "672"
	},
	{
		"countryName": "Nigeria",
		"code": "NG",
		"phoneCode": "234"
	},
	{
		"countryName": "Nicaragua",
		"code": "NI",
		"phoneCode": "505"
	},
	{
		"countryName": "Niue",
		"code": "NU",
		"phoneCode": "683"
	},
	{
		"countryName": "Netherlands",
		"code": "NL",
		"phoneCode": "31"
	},
	{
		"countryName": "Norway",
		"code": "NO",
		"phoneCode": "47"
	},
	{
		"countryName": "Nepal",
		"code": "NP",
		"phoneCode": "977"
	},
	{
		"countryName": "Nauru",
		"code": "NR",
		"phoneCode": "674"
	},
	{
		"countryName": "New Zealand",
		"code": "NZ",
		"phoneCode": "64"
	},
	{
		"countryName": "Oman",
		"code": "OM",
		"phoneCode": "968"
	},
	{
		"countryName": "Pakistan",
		"code": "PK",
		"phoneCode": "92"
	},
	{
		"countryName": "Panama",
		"code": "PA",
		"phoneCode": "507"
	},
	{
		"countryName": "Pitcairn Islands",
		"code": "PN",
		"phoneCode": "64"
	},
	{
		"countryName": "Peru",
		"code": "PE",
		"phoneCode": "51"
	},
	{
		"countryName": "Philippines",
		"code": "PH",
		"phoneCode": "63"
	},
	{
		"countryName": "Palau",
		"code": "PW",
		"phoneCode": "680"
	},
	{
		"countryName": "Papua New Guinea",
		"code": "PG",
		"phoneCode": "675"
	},
	{
		"countryName": "Poland",
		"code": "PL",
		"phoneCode": "48"
	},
	{
		"countryName": "Puerto Rico",
		"code": "PR",
		"phoneCode": "1787"
	},
	{
		"countryName": "Puerto Rico",
		"code": "PR",
		"phoneCode": "1939"
	},
	{
		"countryName": "North Korea",
		"code": "KP",
		"phoneCode": "850"
	},
	{
		"countryName": "Portugal",
		"code": "PT",
		"phoneCode": "351"
	},
	{
		"countryName": "Paraguay",
		"code": "PY",
		"phoneCode": "595"
	},
	{
		"countryName": "Palestine",
		"code": "PS",
		"phoneCode": "970"
	},
	{
		"countryName": "French Polynesia",
		"code": "PF",
		"phoneCode": "689"
	},
	{
		"countryName": "Qatar",
		"code": "QA",
		"phoneCode": "974"
	},
	{
		"countryName": "RÃ©union",
		"code": "RE",
		"phoneCode": "262"
	},
	{
		"countryName": "Romania",
		"code": "RO",
		"phoneCode": "40"
	},
	{
		"countryName": "Russia",
		"code": "RU",
		"phoneCode": "7"
	},
	{
		"countryName": "Rwanda",
		"code": "RW",
		"phoneCode": "250"
	},
	{
		"countryName": "Saudi Arabia",
		"code": "SA",
		"phoneCode": "966"
	},
	{
		"countryName": "Sudan",
		"code": "SD",
		"phoneCode": "249"
	},
	{
		"countryName": "Senegal",
		"code": "SN",
		"phoneCode": "221"
	},
	{
		"countryName": "Singapore",
		"code": "SG",
		"phoneCode": "65"
	},
	{
		"countryName": "South Georgia",
		"code": "GS",
		"phoneCode": "500"
	},
	{
		"countryName": "Svalbard and Jan Mayen",
		"code": "SJ",
		"phoneCode": "4779"
	},
	{
		"countryName": "Solomon Islands",
		"code": "SB",
		"phoneCode": "677"
	},
	{
		"countryName": "Sierra Leone",
		"code": "SL",
		"phoneCode": "232"
	},
	{
		"countryName": "El Salvador",
		"code": "SV",
		"phoneCode": "503"
	},
	{
		"countryName": "San Marino",
		"code": "SM",
		"phoneCode": "378"
	},
	{
		"countryName": "Somalia",
		"code": "SO",
		"phoneCode": "252"
	},
	{
		"countryName": "Saint Pierre and Miquelon",
		"code": "PM",
		"phoneCode": "508"
	},
	{
		"countryName": "Serbia",
		"code": "RS",
		"phoneCode": "381"
	},
	{
		"countryName": "South Sudan",
		"code": "SS",
		"phoneCode": "211"
	},
	{
		"countryName": "SÃ£o TomÃ© and PrÃ­ncipe",
		"code": "ST",
		"phoneCode": "239"
	},
	{
		"countryName": "SuricountryName",
		"code": "SR",
		"phoneCode": "597"
	},
	{
		"countryName": "Slovakia",
		"code": "SK",
		"phoneCode": "421"
	},
	{
		"countryName": "Slovenia",
		"code": "SI",
		"phoneCode": "386"
	},
	{
		"countryName": "Sweden",
		"code": "SE",
		"phoneCode": "46"
	},
	{
		"countryName": "Swaziland",
		"code": "SZ",
		"phoneCode": "268"
	},
	{
		"countryName": "Sint Maarten",
		"code": "SX",
		"phoneCode": "1721"
	},
	{
		"countryName": "Seychelles",
		"code": "SC",
		"phoneCode": "248"
	},
	{
		"countryName": "Syria",
		"code": "SY",
		"phoneCode": "963"
	},
	{
		"countryName": "Turks and Caicos Islands",
		"code": "TC",
		"phoneCode": "1649"
	},
	{
		"countryName": "Chad",
		"code": "TD",
		"phoneCode": "235"
	},
	{
		"countryName": "Togo",
		"code": "TG",
		"phoneCode": "228"
	},
	{
		"countryName": "Thailand",
		"code": "TH",
		"phoneCode": "66"
	},
	{
		"countryName": "Tajikistan",
		"code": "TJ",
		"phoneCode": "992"
	},
	{
		"countryName": "Tokelau",
		"code": "TK",
		"phoneCode": "690"
	},
	{
		"countryName": "Turkmenistan",
		"code": "TM",
		"phoneCode": "993"
	},
	{
		"countryName": "Timor-Leste",
		"code": "TL",
		"phoneCode": "670"
	},
	{
		"countryName": "Tonga",
		"code": "TO",
		"phoneCode": "676"
	},
	{
		"countryName": "Trinidad and Tobago",
		"code": "TT",
		"phoneCode": "1868"
	},
	{
		"countryName": "Tunisia",
		"code": "TN",
		"phoneCode": "216"
	},
	{
		"countryName": "Turkey",
		"code": "TR",
		"phoneCode": "90"
	},
	{
		"countryName": "Tuvalu",
		"code": "TV",
		"phoneCode": "688"
	},
	{
		"countryName": "Taiwan",
		"code": "TW",
		"phoneCode": "886"
	},
	{
		"countryName": "Tanzania",
		"code": "TZ",
		"phoneCode": "255"
	},
	{
		"countryName": "Uganda",
		"code": "UG",
		"phoneCode": "256"
	},
	{
		"countryName": "Ukraine",
		"code": "UA",
		"phoneCode": "380"
	},
	{
		"countryName": "Uruguay",
		"code": "UY",
		"phoneCode": "598"
	},
	{
		"countryName": "United States",
		"code": "US",
		"phoneCode": "1"
	},
	{
		"countryName": "Uzbekistan",
		"code": "UZ",
		"phoneCode": "998"
	},
	{
		"countryName": "Vatican City",
		"code": "VA",
		"phoneCode": "379"
	},
	{
		"countryName": "Saint Vincent and the Grenadines",
		"code": "VC",
		"phoneCode": "1784"
	},
	{
		"countryName": "Venezuela",
		"code": "VE",
		"phoneCode": "58"
	},
	{
		"countryName": "British Virgin Islands",
		"code": "VG",
		"phoneCode": "1284"
	},
	{
		"countryName": "United States Virgin Islands",
		"code": "VI",
		"phoneCode": "1340"
	},
	{
		"countryName": "Vietnam",
		"code": "VN",
		"phoneCode": "84"
	},
	{
		"countryName": "Vanuatu",
		"code": "VU",
		"phoneCode": "678"
	},
	{
		"countryName": "Wallis and Futuna",
		"code": "WF",
		"phoneCode": "681"
	},
	{
		"countryName": "Samoa",
		"code": "WS",
		"phoneCode": "685"
	},
	{
		"countryName": "Yemen",
		"code": "YE",
		"phoneCode": "967"
	},
	{
		"countryName": "South Africa",
		"code": "ZA",
		"phoneCode": "27"
	},
	{
		"countryName": "Zambia",
		"code": "ZM",
		"phoneCode": "260"
	},
	{
		"countryName": "Zimbabwe",
		"code": "ZW",
		"phoneCode": "263"
	}
]