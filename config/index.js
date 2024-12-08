const dotenv = require("dotenv");
const path = require("path");
const readFileSafely = require("../libs/readFileSafely");

const { PROFILE } = process.env;

const envTypes = {
  PROD: "prod",
  PROD_KZN: "prod-kzn",
  PROD_MSK: "prod-msk",
  MRG: "mrg",
  DEVELOP: "develop",
  REPLICATION: "replication",
  TEST: "test",
  LOCAL: "local",
};

let config = null;

switch (PROFILE) {
  case envTypes.PROD:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.prod.env"),
    }).parsed;
    break;
  case envTypes.PROD_MSK:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.prod-msk.env"),
    }).parsed;
    break;
  case envTypes.PROD_KZN:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.prod-kzn.env"),
    }).parsed;
    break;
  case envTypes.MRG:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.mrg.env"),
    }).parsed;
    break;
  case envTypes.DEVELOP:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.develop.env"),
    }).parsed;
    break;
  case envTypes.REPLICATION:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.replication.env"),
    }).parsed;
    break;
  case envTypes.TEST:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.test.env"),
    }).parsed;
    break;
  case envTypes.LOCAL:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.local.env"),
    }).parsed;
    break;

  default:
    config = dotenv.config({
      path: path.resolve(__dirname, ".env/.default.env"),
    }).parsed;
}

const keycloakСerts = [
  readFileSafely(path.resolve(config.KEYCLOAK_DEV_CERT)),
  readFileSafely(path.resolve(config.KEYCLOAK_DEV_TEST)),
  readFileSafely(path.resolve(config.KEYCLOAK_DEV_CA)),
  readFileSafely(path.resolve(config.KEYCLOAK_DEV_ROOT)),
];

const keycloakConfig = readFileSafely(path.resolve(config.KEYCLOAK_CONFIG_PATH));

module.exports = {
  port: config.PORT,
  keys: {
    jwt: config.JWT,
  },
  baseUri: config.BASE_URI,
  SBIS: {
    uri: config.SBIS_URI,
    headers: {
      "Content-Type": config.SBIS_CONTENT_TYPE_HEADER,
    },
  },
  public: config.PUBLIC,
  captchaSecretKey: config.CAPTCHA_SECRET_KEY,
  smtp: {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    pass: config.SMTP_PASS,
    from: config.SMTP_FROM,
    user: config.SMTP_USER,
  },
  db: {
    uri: config.DB_URI,
    port: config.DB_PORT,
    db_name: config.DB_NAME,
  },
  receiver: {
    receiver_name: config.RECEIVER_NAME,
    receiver_inn: config.RECEIVER_INN,
    receiver_kpp: config.RECEIVER_KPP,
  },
  payment: {
    documentCreateUri: config.PAYMENT_CREATE_DOCUMENT_URI,
    apiKey: config.PAYMENT_API_KEY,
    paymentInn: config.PAYMENT_INN,
    caPath: config.PAYMENT_CA ?? "./config/ca.pem",
    certPath: config.PAYMENT_CERT ?? "./config/cert.pem",
    keyPath: config.PAYMENT_KEY ?? "./config/key.pem",
  },
  ttkpg: {
    baseUri: config.TTKPG_BASE_URI,
    merchant: config.TTKPG_MERCHANT,
  },
  jira: {
    JIRA_SERVICEDESK_HOST: config.JIRA_SERVICEDESK_HOST,
    JIRA_SERVICEDESK_REQUEST_TYPE_GROUPS:
      config.JIRA_SERVICEDESK_REQUEST_TYPE_GROUPS.split(",").map((n) =>
        n.trim()
      ),
    JIRA_SERVICEDESK_MAPPING: {
      customfield_10600: "",
      customfield_10601: "",
      customfield_10602: "",
      customfield_10500: "",
      customfield_10501: "",
    },
    JIRA_SERVICEDESK_COMPONENTS: config.JIRA_SERVICEDESK_COMPONENTS.split(
      ","
    ).map((n) => n.trim()),
    JIRA_SERVICEDESK_ID: config.JIRA_SERVICEDESK_ID,
    JIRA_SERVICEDESK_TOKEN: config.JIRA_SERVICEDESK_TOKEN,
    JIRA_SERVICEDESK_LOGIN: config.JIRA_SERVICEDESK_LOGIN,
  },
  smorodina: {
    url: config.SMORODINA_URL,
  },
  keycloakСerts,
  sessionSecretLength: config.SESSION_SECRET_LENGTH,
  redirectUri: config.REDIRECT_URI,
  keycloakConfig: JSON.parse(keycloakConfig),
  defaultUserPassword: config.DEFAULT_USER_PASSWORD,
};
