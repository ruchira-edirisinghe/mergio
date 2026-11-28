// Starts Node.js (nodejs-mobile) inside the app with Mergio's script. Node can only start once per process,
// and node::Start only returns when Node exits, so the app calls this from its own thread. nodejs-mobile sends
// Node's output to logcat itself (adb logcat -s nodejs).
#include <jni.h>
#include <android/log.h>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include "node.h"

namespace {
const char *TAG = "MergioNode";
}  // namespace

extern "C" JNIEXPORT void JNICALL
Java_io_github_ruchiraedirisinghe_mergio_NodeService_setEnv(JNIEnv *env, jclass, jstring key, jstring value) {
  const char *k = env->GetStringUTFChars(key, nullptr);
  const char *v = env->GetStringUTFChars(value, nullptr);
  setenv(k, v, 1);
  env->ReleaseStringUTFChars(key, k);
  env->ReleaseStringUTFChars(value, v);
}

extern "C" JNIEXPORT jint JNICALL
Java_io_github_ruchiraedirisinghe_mergio_NodeService_startNode(JNIEnv *env, jclass, jobjectArray args) {
  // Node wants every argument in one block of memory, one after the other.
  jsize argc = env->GetArrayLength(args);
  std::vector<std::string> parts;
  size_t total = 0;
  for (jsize i = 0; i < argc; i++) {
    auto s = static_cast<jstring>(env->GetObjectArrayElement(args, i));
    const char *c = env->GetStringUTFChars(s, nullptr);
    parts.emplace_back(c);
    total += parts.back().size() + 1;
    env->ReleaseStringUTFChars(s, c);
    env->DeleteLocalRef(s);
  }
  char *block = static_cast<char *>(calloc(total, 1));
  std::vector<char *> argv;
  char *at = block;
  for (auto &p : parts) {
    memcpy(at, p.c_str(), p.size());
    argv.push_back(at);
    at += p.size() + 1;
  }
  __android_log_print(ANDROID_LOG_INFO, TAG, "starting Node.js");
  int code = node::Start(static_cast<int>(argv.size()), argv.data());
  __android_log_print(ANDROID_LOG_WARN, TAG, "Node.js exited with %d", code);
  return code;
}
