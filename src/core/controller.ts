import { Translator, GoogleTranslator } from "../tools/translator";
import { initConfig, ConfigParser } from "../tools/configuration";
import { MessageType } from "../tools/enums";
import { WindowWrapper } from "../tools/windows";
import { windowController } from "../tools/windowController";
import { envConfig } from "../tools/envConfig";
import { l10n, L10N } from "../tools/l10n";
import { RuleName, reverseRuleName } from "../tools/rule";
import { StringProcessor } from "./stringProcessor";
import { Menu, ipcMain, MenuItem, BrowserWindow } from "electron";
const clipboard = require("electron-clipboard-extended");
const t = l10n.getT();
enum MenuItemType {
  normal = "normal",
  separator = "separator",
  submenu = "submenu",
  checkbox = "checkbox",
  radio = "radio"
}

function onMenuClick(id: string) {
  (<any>global).log.debug(id);
}

interface MenuOption {
  label: string;
  type: MenuItemType;
  checked: boolean;
  id: string;
  click?: (
    menuItem: MenuItem,
    browserWindow: BrowserWindow,
    event: Event
  ) => void;
}

function NewMenuItem(option: MenuOption) {
  var key = option.id;
  if (!option.click) {
    option.click = function(
      menuItem: MenuItem,
      browserWindow: BrowserWindow,
      event: Event
    ) {
      onMenuClick(key);
    };
  }
  return new MenuItem(option);
}

class BaseMenu {
  menu = new Menu();
  constructor() {
    this.menu.append(
      NewMenuItem({
        label: t("autoCopy"),
        type: MenuItemType.checkbox,
        checked: false,
        id: "testid"
      })
    );
  }
  popup() {
    this.menu.popup({});
  }
}

class Controller {
  src: string = "";
  result: string = "";
  lastAppend: string = "";
  stringProccessor: StringProcessor = new StringProcessor();
  focusWin: WindowWrapper = new WindowWrapper();
  translator: Translator = new GoogleTranslator();
  config: ConfigParser;
  locales: L10N = l10n;
  menu = new BaseMenu();
  constructor() {
    this.config = initConfig();
    this.config.loadValues(envConfig.sharedConfig.configPath);
    this.setWatch(true);
  }

  createWindow() {
    this.focusWin.createWindow();
    windowController.bind();
  }
  checkClipboard() {
    let text = this.stringProccessor.normalizeAppend(clipboard.readText());
    if (text != this.result && text != this.src) {
      this.doTranslate(text);
    }
  }
  getT() {
    return this.locales.getT(this.config.get(RuleName.locale));
  }
  onError(msg: string) {
    (<any>global).log.error(msg);
  }
  doTranslate(text: string) {
    this.src = text;
    let source = this.source();
    let target = this.target();
    this.translator
      .translate(this.src, source, target)
      .then(res => {
        if (res) {
          this.result = res;
          this.focusWin.sendMsg(MessageType.TranslateResult.toString(), {
            src: this.src,
            result: this.result,
            source: source,
            target: target
          });
        } else {
          this.onError("translate error");
        }
      })
      .catch(err => {
        console.error(err);
      });
  }
  source() {
    return this.config.values.source;
  }
  target() {
    return this.config.values.target;
  }
  setWatch(watch: boolean) {
    if (watch) {
      clipboard.on("text-changed", () => {
        this.checkClipboard();
      });
      clipboard.startWatching();
    } else {
      clipboard.stopWatching();
    }
  }
  setByKeyValue(ruleKey: string, value: any) {
    let ruleValue = reverseRuleName[ruleKey];
    switch (ruleValue) {
      case RuleName.isListen:
        (<any>global).log.debug(ruleKey, "1");
        break;
      case RuleName.isDete:
        (<any>global).log.debug(ruleKey, "2");
        break;
      default:
        (<any>global).log.debug(ruleKey, "3");
    }
    this.config.setByKeyValue(ruleKey, value);
    this.config.saveValues(envConfig.sharedConfig.configPath);
  }
}
export { Controller };
