//
//  ACMainClass.h
//  AddressConnect
//
//  Created by Stefan Lange-Hegermann on 27.05.09.
//  Copyright 2009 sipgate GmbH. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import <AddressBook/AddressBook.h>

@interface ACMainClass : NSObject {
	ABAddressBook *ab;
}

- (NSArray *)allContacts;

@end
