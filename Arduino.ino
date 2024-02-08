#include <Servo.h>

Servo monServo;

String a;
int in = 90;
int pos = in;
int speed = 0;

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(100);
  monServo.attach(2, 600, 2300);
  monServo.write(in);
  analogWriteResolution(8);
  pinMode(DAC0, OUTPUT);
  pinMode(DAC1, OUTPUT);
  Serial1.begin(9600);
  Serial1.setTimeout(100);
}

void printValues(int a) {
  Serial.print("Angle : ");
  Serial.print(a);
  Serial.print(" and Speed : ");
  Serial.println(speed);
}

void loop() {
  if (Serial.available()) {
    in = pos;
    String data = Serial.readStringUntil('\n');
    Serial1.println(data);
    Serial.println(data);

    int indexPointVirgule = data.indexOf(';');

    String posStr = data.substring(0, indexPointVirgule);
    String speedStr = data.substring(indexPointVirgule + 1);

    pos = posStr.toInt();
    speed = speedStr.toInt();

    analogWrite(DAC0, speed);
    
    if (pos >= 90 && pos <= 150) {
      for (int i = in; i < pos; i++) {
        monServo.write(i);
        delay(15);
        printValues(i);
      }
    }
    else if (pos >= 30) {
      for (int i = in; i > pos; i--) {
        monServo.write(i);
        delay(15);
        printValues(i);
      }
    }
  }
  else{
    analogWrite(DAC0, 0);
    delay(500);
  }
}
