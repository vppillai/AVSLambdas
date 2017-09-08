## Microchip share value skill

This skill will fetch the last traded value of Microchip share (MCHP) and announce it 

Also, the lambda will publish a MQTT message with the share value to the  topic corresponding to the email address of account linked with the topic in `test.mosquitto.org` public broker.

  - Only Amazon accounts can be used for linking
  - while testing, if no accounts are linked, message will be published to microchip@microchip.com
  - sample subscription : `mosquitto_sub -h test.mosquitto.org -p 1883 -t microchip@microchip.com`
    - replace the email address with your amazon account used to account link the skill

### Additional node modules added
  - mqtt

Lambda function needs to be uploaded as zip. The js file outside is for reference. 
