#include <Servo.h>

Servo monServo;

String a;
int in = 90;
int pos = in;
int speed = 0;
int forwardDirection;
int lastDir = 100;

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(10);
  monServo.attach(2, 600, 2300);
  monServo.write(in);
  analogWriteResolution(8);
  pinMode(DAC0, OUTPUT);
  pinMode(24, OUTPUT);  
  Serial1.begin(9600);
  Serial1.setTimeout(10);
}

void printValues(int a) {
  Serial.print("Angle : ");
  Serial.print(a);
  Serial.print(" and Speed : ");
  Serial.println(speed);
}

void loop() {
  if (Serial1.available()) {
    in = pos;
    String data = Serial1.readString();
    Serial.println(data);

    int indexFirstSemicolon = data.indexOf(';');
    int indexSecondSemicolon = data.indexOf(';', indexFirstSemicolon + 1);

    String posStr = data.substring(0, indexFirstSemicolon);
    String speedStr = data.substring(indexFirstSemicolon + 1);
    String directionStr = data.substring(indexSecondSemicolon + 1);

    pos = posStr.toInt();
    speed = speedStr.toInt();
    forwardDirection = directionStr.toInt();

    if (forwardDirection != lastDir){
      analogWrite(DAC0, 0);
      delay(500);
    }

    if (forwardDirection){
      lastDir = forwardDirection;
      digitalWrite(24, HIGH);
      analogWrite(DAC0, speed);
      delay(500);
    }
    else {
      digitalWrite(24, LOW);
      analogWrite(DAC0, speed);
      delay(500);
    }
    
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
