import { _decorator, Component, Node } from 'cc';
// import { yasio } from 'yasio';
const { ccclass, property } = _decorator;

if (!String.prototype.format) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
        ;
      });
    };
  }

@ccclass('hello')
export class hello extends Component {
    private elapsed: number = 0.0;
    private service: any = null;
    private yserverID: any;
    private yclientID: any;
    private testStarted = false;
    start() {
    }

    update(deltaTime: number) {
        // console.log("============= start test yasio");
        this.elapsed += deltaTime;
        if (this.elapsed > 5.0) {
            if (!this.testStarted) {
                console.log("============= start test yasio");
                this.testStarted = true;
                this.yasioTest();
            }
        }
    }

    yasioTest() {
        // ------- start of yasio test ----------
        var hostents = [
          { host: "0.0.0.0", port: 8081 },
          { host: "0.0.0.0", port: 8082 },
        ];
      
        var yserver = new yasio.io_service(hostents);
        yserver.start(function (event) {
          var kind = event.kind();
          if (kind == yasio.YEK_ON_OPEN) {
            console.log("yasio event --> a connection income, kind=", event.kind());
            var tsport = event.transport();
            var obs = new yasio.obstream(256);
            obs.push32();
            obs.write_bool(true);
            obs.write_bool(false);
            obs.write_i8(256);
            obs.write_i16(20001);
            obs.write_i32(191011);
            obs.write_f(28.9);
            obs.write_lf(209.79);
            obs.write_v("hello client!");
            obs.pop32(obs.length());
      
            console.log("yasio server: will send partial1 of data after 3 seconds...");
            var partial1 = obs.sub(0, 10);
            yasio.setTimeout(function () {
              console.log("yasio server --> send data partial1, length=" + partial1.length());
              yserver.write(tsport, partial1);
      
              var partial2 = obs.sub(10);
              console.log("yasio server: will send partial2 of data after 2 seconds...");
      
              yasio.setTimeout(function () {
                console.log("yasio server --> send data partial2, length=" + partial2.length());
                yserver.write(tsport, partial2);
              }, 2);
            }, 3);
          }
          else if (kind == yasio.YEK_ON_CLOSE) {
            console.log("yasio server: The connection is lost!");
          }
        });
        yserver.set_option(yasio.YOPT_C_UNPACK_PARAMS, 
          0, // channelIndex
          65535, // maxFrameLength, 最大包长度
          0,  // lenghtFieldOffset, 长度字段偏移，相对于包起始字节
          4, // lengthFieldLength, 长度字段大小，支持1字节，2字节，3字节，4字节
          0 // lengthAdjustment：如果长度字段字节大小包含包头，则为0， 否则，这里=包头大小
        );
        yserver.open(0, yasio.YCK_TCP_SERVER);
      
        var yclient = new yasio.io_service({ host: "127.0.0.1", port: 8081 });
      
        var tsport_c = null;
      
        let thiz = this;
        yclient.start(function (event) {
          var kind = event.kind();
          if (kind == yasio.YEK_ON_OPEN) {
            console.log("yasio event --> connect server succeed, kind=" + event.kind());
            tsport_c = event.transport();
          }
          else if (kind == yasio.YEK_ON_PACKET) {
            console.log(`yasio client --> receive a packet from server, kind=${event.kind()}, close connect after 3 seconds`);
            var ibs = event.packet();
      
            var msg = {};
            ibs.seek(4, yasio.SEEK_CUR); // skip length field
            msg.bval1 = ibs.read_bool();
            msg.bval2 = ibs.read_bool();
            msg.u8val = ibs.read_i8();
            msg.i16val = ibs.read_i16();
            msg.i32val = ibs.read_i32();
            msg.fval = ibs.read_f();
            msg.lfval = ibs.read_lf();
            msg.strval = ibs.read_v();
            
            console.log("receive msg from server -->\n msg.bval1={0}\n msg.bval2={1}\n msg.i8val={2}\n msg.i16val={3}\n msg.i32val={4}\n msg.fval={5}\n msg.lfval={6}\n msg.strval={7}\n".format(
              msg.bval1.toString(),
              msg.bval2.toString(),
              msg.u8val,
              msg.i16val,
              msg.i32val,
              msg.fval.toString(),
              msg.lfval.toString(),
              msg.strval));
      
            yasio.setTimeout(function () {
              yasio.clearInterval(thiz.yclientID);
              yclient.stop(); // must stop if you never want use the service, make sure it can be GC.
              yclient = null;
            }, 3);
          }
        });
      
        yclient.set_option(yasio.YOPT_C_UNPACK_PARAMS, 
          0, // channelIndex
          65535, // maxFrameLength, 最大包长度
          0,  // lenghtFieldOffset, 长度字段偏移，相对于包起始字节
          4, // lengthFieldLength, 长度字段大小，支持1字节，2字节，3字节，4字节
          0 // lengthAdjustment：如果长度字段字节大小包含包头，则为0， 否则，这里=包头大小
        );
      
        yclient.open(0, yasio.YCK_TCP_CLIENT);
      
        // run the event-loop
        this.yserverID = yasio.setInterval(function () {
          yserver.dispatch(128);
        }, 0.01);
      
        this.yclientID = yasio.setInterval(function () {
          yclient.dispatch(128);
        }, 0.01);
      
        // ========== end of yasio test ==========
      }
}

