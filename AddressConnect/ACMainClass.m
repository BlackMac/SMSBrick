//
//  ACMainClass.m
//  AddressConnect
//
//  Created by Stefan Lange-Hegermann on 27.05.09.
//  Copyright 2009 sipgate GmbH. All rights reserved.
//

#import "ACMainClass.h"
#import <WebKit/WebKit.h>

@implementation ACMainClass

- (id) initWithWebView:(WebView*)webview
{
	self = [super init];
    if (self) {
        // Initialization code here.
    }
    return self;
}

- (void) windowScriptObjectAvailable:(WebScriptObject *) windowScriptObject
{
    [windowScriptObject setValue:self forKey:@"AddressConnect"];
}

+ (NSString *)webScriptNameForSelector:(SEL)aSelector
{
	NSString *name=@"";
	if (aSelector == @selector(allContacts))
		name= @"allContacts";
	
	return name;
}

- (NSArray *)allContacts
{
	NSMutableArray *jscontacts=[NSMutableArray array];
	NSArray *contacts= [[ABAddressBook sharedAddressBook] people];
	NSEnumerator *cenum=[contacts objectEnumerator];
	ABPerson *person;

	while (person=[cenum nextObject]) {
		[jscontacts addObject:[[NSString alloc] initWithData:[person vCardRepresentation] encoding:NSUTF8StringEncoding]];
	}
	return jscontacts;
}

+ (BOOL)isSelectorExcludedFromWebScript:(SEL)aSelector
{
	if (aSelector!=@selector(allContacts)) return YES;
	return NO;
}

+ (BOOL)isKeyExcludedFromWebScript:(const char *)name
{
	return NO;
}
@end
