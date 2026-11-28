cmake_minimum_required(VERSION 3.22.1)
project(mergio)

# Node.js for Android (nodejs-mobile): headers and libnode.so, downloaded by scripts/android.mjs
set(LIBNODE ${CMAKE_SOURCE_DIR}/../../../libnode)
include_directories(${LIBNODE}/include/node)

add_library(libnode SHARED IMPORTED)
set_target_properties(libnode PROPERTIES IMPORTED_LOCATION ${LIBNODE}/bin/${ANDROID_ABI}/libnode.so)

add_library(mergio-node SHARED node-bridge.cpp)
find_library(log-lib log)
target_link_libraries(mergio-node libnode ${log-lib})
